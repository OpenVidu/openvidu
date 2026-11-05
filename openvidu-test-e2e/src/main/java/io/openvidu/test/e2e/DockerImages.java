package io.openvidu.test.e2e;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Makes sure that the Docker images of the suite are in the local Docker store
 * before a container needs them, so that no test depends on a registry answering
 * within the pull limits of Testcontainers (no progress in 30 s or no image in 2
 * minutes, by default).
 *
 * Those limits failed the first browser tests of three suites on 2026-11-05: six
 * suites on self-hosted runners that share one uplink pulled the Selenium images,
 * republished that morning, at the same time, and the suites' own background
 * "docker pull" of the same image was still running when Testcontainers gave up
 * (CI runs 42067419196, 42067628201 and 42067670919).
 *
 * Every image is pulled at most once per JVM, with retries and a long limit per
 * attempt. {@link #prePull(String...)} queues pulls in the background, one image
 * at a time and in the given order, and {@link #await(String)} returns once the
 * image is local: it waits for the pull already running, or pulls the image right
 * away on the calling thread if no pull of it has started yet. An image that
 * cannot be pulled fails every {@link #await(String)} of it at once, with the
 * Docker error, instead of costing each test another round of retries.
 */
public final class DockerImages {

	private static final Logger log = LoggerFactory.getLogger(DockerImages.class);

	private static final int PULL_ATTEMPTS = 3;
	// About 1 GB, the size of each Selenium image, at the 1.5 MB/s seen on a
	// congested runner takes 11 minutes
	private static final Duration PULL_ATTEMPT_TIMEOUT = Duration.ofMinutes(20);
	// Multiplied by the number of the failed attempt
	private static final Duration PULL_RETRY_DELAY = Duration.ofSeconds(30);

	private static final Map<String, Pull> pulls = new ConcurrentHashMap<>();

	private static final ExecutorService background = Executors.newSingleThreadExecutor(runnable -> {
		Thread thread = new Thread(runnable, "docker-image-prepull");
		thread.setDaemon(true);
		return thread;
	});

	private DockerImages() {
	}

	/**
	 * Queues the pull of the images in the background, one image at a time and in
	 * this order, and returns at once. Images whose pull has already been queued or
	 * started are skipped.
	 */
	public static void prePull(String... images) {
		for (String image : images) {
			Pull pull = pulls.computeIfAbsent(image, Pull::new);
			background.execute(pull::run);
		}
	}

	/**
	 * Returns once the image is in the local Docker store, pulling it if needed.
	 *
	 * @throws IllegalStateException if the image could not be pulled
	 */
	public static void await(String image) {
		Pull pull = pulls.computeIfAbsent(image, Pull::new);
		pull.run();
		try {
			pull.done.join();
		} catch (CompletionException e) {
			throw new IllegalStateException(e.getCause().getMessage(), e.getCause());
		}
	}

	private static final class Pull {

		private final String image;
		private final AtomicBoolean started = new AtomicBoolean();
		private final CompletableFuture<Void> done = new CompletableFuture<>();

		private Pull(String image) {
			this.image = image;
		}

		// Runs the pull on the calling thread, unless another thread has started it
		private void run() {
			if (!started.compareAndSet(false, true)) {
				return;
			}
			try {
				pullImage(image);
				done.complete(null);
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
				done.completeExceptionally(e);
			} catch (Throwable t) {
				done.completeExceptionally(t);
			}
		}
	}

	private static void pullImage(String image) throws InterruptedException {
		boolean local = isLocal(image);
		if (local && !isMutable(image)) {
			log.info("Docker image {} is already local", image);
			return;
		}
		long start = System.nanoTime();
		if (local) {
			// A local "latest" may be outdated: refresh it as "docker pull" always did, but
			// fall back to the local copy instead of retrying when the registry fails
			String error = dockerPull(image);
			if (error == null) {
				log.info("Docker image {} is up to date ({} s)", image, secondsSince(start));
			} else {
				log.warn("Could not refresh Docker image {} ({}). Using the local copy", image, error);
			}
			return;
		}
		String error = null;
		for (int attempt = 1; attempt <= PULL_ATTEMPTS; attempt++) {
			log.info("Pulling Docker image {} (attempt {}/{})", image, attempt, PULL_ATTEMPTS);
			error = dockerPull(image);
			if (error == null && isLocal(image)) {
				log.info("Pulled Docker image {} in {} s", image, secondsSince(start));
				return;
			}
			log.warn("Pull of Docker image {} failed (attempt {}/{}): {}", image, attempt, PULL_ATTEMPTS, error);
			if (attempt < PULL_ATTEMPTS) {
				Thread.sleep(PULL_RETRY_DELAY.multipliedBy(attempt).toMillis());
			}
		}
		throw new IllegalStateException("Could not pull Docker image " + image + " in " + PULL_ATTEMPTS
				+ " attempts (" + secondsSince(start) + " s). Last error: " + error);
	}

	// A tag that registries move to newer images: "latest", explicit or implied
	private static boolean isMutable(String image) {
		if (image.contains("@")) {
			return false;
		}
		String name = image.substring(image.lastIndexOf('/') + 1);
		return !name.contains(":") || name.endsWith(":latest");
	}

	private static boolean isLocal(String image) throws InterruptedException {
		try {
			Process inspect = new ProcessBuilder("docker", "image", "inspect", "--format", "{{.Id}}", image)
					.redirectErrorStream(true).redirectOutput(ProcessBuilder.Redirect.DISCARD).start();
			if (!inspect.waitFor(60, TimeUnit.SECONDS)) {
				inspect.destroyForcibly();
				return false;
			}
			return inspect.exitValue() == 0;
		} catch (java.io.IOException e) {
			log.warn("Could not run docker image inspect {}: {}", image, e.getMessage());
			return false;
		}
	}

	// Null if the pull succeeded, the reason why not otherwise
	private static String dockerPull(String image) throws InterruptedException {
		try {
			// --quiet keeps the output to the image name or the error, far below the pipe
			// buffer, so it can be read once the process has ended
			Process pull = new ProcessBuilder("docker", "pull", "--quiet", image).redirectErrorStream(true).start();
			if (!pull.waitFor(PULL_ATTEMPT_TIMEOUT.toSeconds(), TimeUnit.SECONDS)) {
				pull.destroyForcibly();
				return "no result in " + PULL_ATTEMPT_TIMEOUT.toMinutes() + " minutes";
			}
			String output = new String(pull.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
			return pull.exitValue() == 0 ? null : "exit code " + pull.exitValue() + ": " + output;
		} catch (java.io.IOException e) {
			return e.getMessage();
		}
	}

	private static long secondsSince(long startNanos) {
		return TimeUnit.NANOSECONDS.toSeconds(System.nanoTime() - startNanos);
	}

}
