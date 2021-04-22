package io.openvidu.server.utils;

public class RemoteOperationUtils {

	private final static String VALUE = "SKIP_REMOTE_OPERATION";

	private static final ThreadLocal<String> threadLocal = ThreadLocal.withInitial(() -> "");

	public static void setToSkipRemoteOperations() {
		threadLocal.set(VALUE);
	}

	public static boolean mustSkipRemoteOperation() {
		return VALUE.equals(threadLocal.get());
	}

	public static void revertToRunRemoteOperations() {
		threadLocal.remove();
	}

}
