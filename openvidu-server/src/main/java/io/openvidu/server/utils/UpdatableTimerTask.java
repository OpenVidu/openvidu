package io.openvidu.server.utils;

import java.util.Objects;
import java.util.Timer;
import java.util.TimerTask;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class UpdatableTimerTask extends TimerTask {

	private static final Logger log = LoggerFactory.getLogger(UpdatableTimerTask.class);

	private Runnable task;
	private Supplier<Long> period;
	private Long oldP;
	private Timer timer;

	/**
	 * @param task   The task to run periodically.
	 * @param period Delay before first execution and period to wait between
	 *               executions.Besides, this function will be called after each
	 *               execution of the task to update the period if necessary. This
	 *               way, the current wait period will always be respected before
	 *               updating the value (if the function returns a different long
	 *               than previous one just after the task ends).
	 */
	public UpdatableTimerTask(Runnable task, Supplier<Long> period) {
		super();
		Objects.requireNonNull(task);
		Objects.requireNonNull(period);
		this.task = task;
		this.period = period;
	}

	private UpdatableTimerTask(Runnable task, Supplier<Long> period, Long oldP) {
		this(task, period);
		this.oldP = oldP;
	}

	public void updateTimer() {
		Long p = period.get();
		Objects.requireNonNull(p);
		if (oldP == null || !oldP.equals(p)) {
			cancel();
			if (timer == null) {
				timer = new Timer();
			} else {
				timer.cancel();
				timer.purge();
			}
			timer.schedule(new UpdatableTimerTask(task, period, p), p, p);
		}
	}

	public void cancelTimer() {
		super.cancel();
		if (timer != null) {
			timer.cancel();
			timer.purge();
		}
	}

	@Override
	public void run() {
		// Protect the inner run method so if any exception is thrown, the following
		// scheduled TimerTask doesn't get cancelled
		try {
			task.run();
		} catch (Exception e) {
			log.error("Exception running UpdatableTimerTask ({}): {} - {}", e.getClass().getName(), e.getMessage(),
					e.getStackTrace());
		}
		updateTimer();
	}

}
