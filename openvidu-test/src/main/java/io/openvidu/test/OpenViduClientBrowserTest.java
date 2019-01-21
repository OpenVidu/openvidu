/*
 * (C) Copyright 2017-2019 OpenVidu (https://openvidu.io/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.openvidu.test;

import static io.openvidu.test.config.RoomTestConfiguration.ROOM_APP_CLASSNAME_DEFAULT;
import static io.openvidu.test.config.RoomTestConfiguration.ROOM_APP_CLASSNAME_PROP;
import static org.junit.Assert.fail;
import static org.kurento.commons.PropertiesManager.getProperty;
import static org.kurento.test.config.TestConfiguration.SELENIUM_SCOPE_PROPERTY;
import static org.kurento.test.config.TestConfiguration.TEST_URL_TIMEOUT_DEFAULT;
import static org.kurento.test.config.TestConfiguration.TEST_URL_TIMEOUT_PROPERTY;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorCompletionService;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.Assert;
import org.junit.BeforeClass;
import org.kurento.commons.PropertiesManager;
import org.kurento.jsonrpc.JsonUtils;
import org.kurento.test.base.BrowserTest;
import org.kurento.test.browser.Browser;
import org.kurento.test.browser.BrowserType;
import org.kurento.test.browser.WebPage;
import org.kurento.test.browser.WebPageType;
import org.kurento.test.config.BrowserScope;
import org.kurento.test.config.TestScenario;
import org.kurento.test.services.KmsService;
import org.kurento.test.services.Service;
import org.kurento.test.services.TestService;
import org.kurento.test.services.WebServerService;
import org.openqa.selenium.By;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.ElementNotVisibleException;
import org.openqa.selenium.NoSuchElementException;
import org.openqa.selenium.Point;
import org.openqa.selenium.TimeoutException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import com.google.gson.JsonArray;

/**
 * Base for Kurento Room tests with browsers.
 *
 * @author Radu Tom Vlad (rvlad@naevatec.com)
 * @since 6.2.1
 */
public abstract class OpenViduClientBrowserTest<W extends WebPage> extends BrowserTest<W> {

  public interface UserLifecycle {
    public void run(int numUser, int iteration) throws Exception;
  }

  public interface Task {
    public void exec(int numTask) throws Exception;
  }

  static class KmsUriSetterService extends TestService {

    private KmsService kms;

    public KmsUriSetterService(KmsService kms) {
      this.kms = kms;
    }

    @Override
    public TestServiceScope getScope() {
      return kms.getScope();
    }

    @Override
    public void start() {
      super.start();
      String uri = kms.getWsUri();
      System.setProperty("kms.uris", "[\"" + uri + "\"]");
      System.setProperty("kms.uri", uri);
      log.debug("Set system properties 'kms.uri' to {} & 'kms.uris' to [{}] ", uri, uri);
    }

  }

  public static long TASKS_TIMEOUT_IN_MINUTES = 15 * 60;

  public static int POLLING_LATENCY = 100;
  public static int WEB_TEST_MAX_WIDTH = 1200;
  public static int WEB_TEST_LEFT_BAR_WIDTH = 60;
  public static int WEB_TEST_TOP_BAR_WIDTH = 30;
  public static int WEB_TEST_BROWSER_WIDTH = 500;
  public static int WEB_TEST_BROWSER_HEIGHT = 400;

  public static String ROOM_PREFIX = "room";
  public static String USER_BROWSER_PREFIX = "browser";
  public static String USER_FAKE_PREFIX = "user";

  public static @Service(1) KmsService kms = new KmsService();
  public static @Service(2) KmsUriSetterService kmsUriSetter = new KmsUriSetterService(kms);

  public static BrowserScope testScope = BrowserScope.LOCAL;
  public static Class<?> webServerClass;

  static {
    loadWebServerClass();
    if (webServerClass == null) {
      Assert.fail("Unable to load any of the provided classnames for the web server test service");
    }

    String scopeProp = PropertiesManager.getProperty(SELENIUM_SCOPE_PROPERTY);
    if (scopeProp != null) {
      testScope = BrowserScope.valueOf(scopeProp.toUpperCase());
    }
  }

  public static @Service(99) WebServerService webServer = new WebServerService(webServerClass);

  public static int testTimeout;

  public static SecureRandom random = new SecureRandom();

  public WebPageType webPageType = WebPageType.ROOM;

  public int PLAY_TIME = 5; // seconds

  public int ITERATIONS = 2;

  public Object browsersLock = new Object();

  public String roomName = ROOM_PREFIX;

  public Map<String, Exception> execExceptions = new HashMap<String, Exception>();

  public boolean failed = false;

  public OpenViduClientBrowserTest() {
    setDeleteLogsIfSuccess(false); // always keep the logs
  }

  @BeforeClass
  public static void beforeClass() {
    testTimeout = getProperty(TEST_URL_TIMEOUT_PROPERTY, TEST_URL_TIMEOUT_DEFAULT);
    log.debug("Test timeout: {}", testTimeout);
  }

  @Override
  public void setupBrowserTest() throws InterruptedException {
    super.setupBrowserTest();

    execExceptions.clear();

    if (testScenario != null && testScenario.getBrowserMap() != null
        && testScenario.getBrowserMap().size() > 0) {
      int row = 0;
      int col = 0;
      for (final String browserKey : testScenario.getBrowserMap().keySet()) {
        Browser browser = getPage(browserKey).getBrowser();
        browser.getWebDriver().manage().window()
            .setSize(new Dimension(WEB_TEST_BROWSER_WIDTH, WEB_TEST_BROWSER_HEIGHT));
        browser
            .getWebDriver()
            .manage()
            .window()
            .setPosition(
                new Point(col * WEB_TEST_BROWSER_WIDTH + WEB_TEST_LEFT_BAR_WIDTH, row
                    * WEB_TEST_BROWSER_HEIGHT + WEB_TEST_TOP_BAR_WIDTH));
        col++;
        if (col * WEB_TEST_BROWSER_WIDTH + WEB_TEST_LEFT_BAR_WIDTH > WEB_TEST_MAX_WIDTH) {
          col = 0;
          row++;
        }
      }
    }
  }

  @Override
  public void teardownBrowserTest() {
    super.teardownBrowserTest();
    failWithExceptions();
  }

  public static Collection<Object[]> localChromes(String caller, int browsers, WebPageType pageType) {
    TestScenario test = new TestScenario();
    for (int i = 0; i < browsers; i++) {
      Browser browser = new Browser.Builder().webPageType(pageType).browserType(BrowserType.CHROME)
          .scope(BrowserScope.LOCAL).build();
      test.addBrowser(getBrowserKey(i), browser);
    }
    log.debug("{}: Web browsers: {}, webPageType: {}, test scope: {}, Browsers map keySet: {}",
        caller, browsers, pageType, testScope.toString(), test.getBrowserMap().keySet());
    return Arrays.asList(new Object[][] { { test } });
  }

  public static void loadWebServerClass() {
    try {
      List<String> auxList = JsonUtils.toStringList(PropertiesManager.getPropertyJson(
          ROOM_APP_CLASSNAME_PROP, ROOM_APP_CLASSNAME_DEFAULT, JsonArray.class));

      for (String aux : auxList) {
        log.info("Loading class '{}' as the test's web server service", aux);
        try {
          webServerClass = Class.forName(aux);
          break;
        } catch (Exception e) {
          log.warn("Couldn't load web server class '{}': {}", aux, e.getMessage());
          log.debug("Couldn't load web server class '{}'", aux, e);
        }
      }
    } catch (Exception e) {
      log.error("Incorrect value for property '{}'", ROOM_APP_CLASSNAME_PROP, e);
    }
  }

  public static void sleep(long seconds) {
    try {
      Thread.sleep(seconds * 1000);
    } catch (InterruptedException e) {
      log.warn("Interrupted while sleeping {}seconds", seconds, e);
    }
  }

  public static String getBrowserKey(int index) {
    return USER_BROWSER_PREFIX + index;
  }

  public static String getBrowserStreamName(int index) {
    return getBrowserKey(index) + "_webcam";
  }

  public static String getBrowserVideoStreamName(int index) {
    return "video-" + getBrowserStreamName(index);
  }

  public static String getBrowserNativeStreamName(int index) {
    return "native-" + getBrowserVideoStreamName(index);
  }

  public static String getFakeKey(int index) {
    return USER_FAKE_PREFIX + index;
  }

  public static String getFakeStreamName(int index) {
    return getFakeKey(index) + "_webcam";
  }

  public static String getFakeStreamName(String userName) {
    return userName + "_webcam";
  }

  public static String getFakeVideoStreamName(int index) {
    return "video-" + getFakeStreamName(index);
  }

  public static String getFakeNativeStreamName(int index) {
    return "native-" + getFakeVideoStreamName(index);
  }

  public static CountDownLatch[] createCdl(int numLatches, int numUsers) {
    final CountDownLatch[] cdl = new CountDownLatch[numLatches];
    for (int i = 0; i < numLatches; i++) {
      cdl[i] = new CountDownLatch(numUsers);
    }
    return cdl;
  }

  public void iterParallelUsers(int numUsers, int iterations, final UserLifecycle user)
      throws InterruptedException, ExecutionException, TimeoutException {

    int totalExecutions = iterations * numUsers;
    ExecutorService threadPool = Executors.newFixedThreadPool(totalExecutions);
    ExecutorCompletionService<Void> exec = new ExecutorCompletionService<>(threadPool);
    List<Future<Void>> futures = new ArrayList<>();

    try {
      for (int j = 0; j < iterations; j++) {
        final int it = j;
        log.info("it#{}: Starting execution of {} users", it, numUsers);
        for (int i = 0; i < numUsers; i++) {
          final int numUser = i;
          final Browser browser = getPage(getBrowserKey(i)).getBrowser();
          futures.add(exec.submit(new Callable<Void>() {
            @Override
            public Void call() throws Exception {
              Thread.currentThread().setName("it" + it + "|browser" + numUser);
              if (it > 0) {
                log.debug("Page reloaded");
                browser.reload();
              }
              user.run(numUser, it);
              return null;
            }
          }));
        }

        for (int i = 0; i < numUsers; i++) {
          try {
            exec.take().get();
          } catch (ExecutionException e) {
            log.error("Execution exception", e);
            throw e;
          }
        }
        log.info("it#{}: Finished execution of {} users", it, numUsers);
      }
    } finally {
      threadPool.shutdownNow();
    }
  }

  public void parallelTasks(int numThreads, final String thPrefix, String taskName, final Task task) {
    ExecutorService threadPool = Executors.newFixedThreadPool(numThreads);
    ExecutorCompletionService<Void> exec = new ExecutorCompletionService<>(threadPool);
    try {
      for (int i = 0; i < numThreads; i++) {
        final int numTask = i;
        exec.submit(new Callable<Void>() {
          @Override
          public Void call() throws Exception {
            String thname = Thread.currentThread().getName();
            Thread.currentThread().setName(thPrefix + numTask);
            task.exec(numTask);
            Thread.currentThread().setName(thname);
            return null;
          }
        });
      }
      for (int i = 0; i < numThreads; i++) {
        String thTask = taskName + "-" + thPrefix + i;
        try {
          log.debug("Waiting for the {} execution to complete ({}/{})", thTask, i + 1, numThreads);
          exec.take().get();
          log.debug("Job {} completed ({}/{})", thTask, i + 1, numThreads);
        } catch (ExecutionException e) {
          log.debug("Execution exception of {} ({}/{})", thTask, i + 1, numThreads, e);
          execExceptions.put(taskName + "-" + thPrefix + i, e);
        } catch (InterruptedException e) {
          log.error("Interrupted while waiting for execution of task{}", i, e);
        }
      }
    } finally {
      threadPool.shutdown();
      try {
        threadPool.awaitTermination(TASKS_TIMEOUT_IN_MINUTES, TimeUnit.MINUTES);
      } catch (InterruptedException e) {
        log.warn("Tasks were executed more than {} minutes. Stopping it", TASKS_TIMEOUT_IN_MINUTES);
        threadPool.shutdownNow();
      }

    }
  }

  public void joinToRoom(int pageIndex, String userName, String roomName) {
    Browser userBrowser = getPage(getBrowserKey(pageIndex)).getBrowser();
    WebElement nameInput = findElement(userName, userBrowser, "name");
    nameInput.clear();
    nameInput.sendKeys(userName);
    WebElement roomInput = findElement(userName, userBrowser, "roomName");
    roomInput.clear();
    roomInput.sendKeys(roomName);
    findElement(userName, userBrowser, "joinBtn").submit();
    log.debug("Clicked on 'joinBtn' in {}", userName);
  }

  public void exitFromRoom(int pageIndex, String userName) {
    Browser userBrowser = getPage(getBrowserKey(pageIndex)).getBrowser();
    try {
      Actions actions = new Actions(userBrowser.getWebDriver());
      actions.click(findElement(userName, userBrowser, "buttonLeaveRoom")).perform();
      log.debug("'buttonLeaveRoom' clicked on in {}", userName);
    } catch (ElementNotVisibleException e) {
      log.warn("Button 'buttonLeaveRoom' is not visible. Session can't be closed");
    }
  }

  public void unsubscribe(int pageIndex, int unsubscribeFromIndex) {
    String clickableVideoTagId = getBrowserVideoStreamName(unsubscribeFromIndex);
    selectVideoTag(pageIndex, clickableVideoTagId);

    WebDriver userWebDriver = getPage(getBrowserKey(pageIndex)).getBrowser().getWebDriver();
    try {
      userWebDriver.findElement(By.id("buttonDisconnect")).click();
    } catch (ElementNotVisibleException e) {
      String msg = "Button 'buttonDisconnect' is not visible. Can't unsubscribe from media.";
      log.warn(msg);
      fail(msg);
    }
  }

  public void selectVideoTag(int pageIndex, String targetVideoTagId) {
    WebDriver userWebDriver = getPage(getBrowserKey(pageIndex)).getBrowser().getWebDriver();
    try {
      WebElement element = userWebDriver.findElement(By.id(targetVideoTagId));
      Actions actions = new Actions(userWebDriver);
      actions.moveToElement(element).click().perform();
    } catch (ElementNotVisibleException e) {
      String msg = "Video tag '" + targetVideoTagId + "' is not visible, thus not selectable.";
      log.warn(msg);
      fail(msg);
    }
  }

  protected void unpublish(int pageIndex) {
    WebDriver userWebDriver = getPage(getBrowserKey(pageIndex)).getBrowser().getWebDriver();
    try {
      userWebDriver.findElement(By.id("buttonDisconnect")).click();
    } catch (ElementNotVisibleException e) {
      log.warn("Button 'buttonDisconnect' is not visible. Can't unpublish media.");
    }
  }

  public WebElement findElement(String label, Browser browser, String id) {
    try {
      return new WebDriverWait(browser.getWebDriver(), testTimeout, POLLING_LATENCY)
          .until(ExpectedConditions.presenceOfElementLocated(By.id(id)));
    } catch (TimeoutException e) {
      log.warn("Timeout when waiting for element {} to exist in browser {}", id, label);
      int originalTimeout = 60;
      try {
        originalTimeout = browser.getTimeout();
        log.debug("Original browser timeout (s): {}, set to 10", originalTimeout);
        browser.setTimeout(10);
        browser.changeTimeout(10);
        WebElement elem = browser.getWebDriver().findElement(By.id(id));
        log.info("Additional findElement call was able to locate {} in browser {}", id, label);
        return elem;
      } catch (NoSuchElementException e1) {
        log.debug("Additional findElement call couldn't locate {} in browser {} ({})", id, label,
            e1.getMessage());
        throw new NoSuchElementException("Element with id='" + id + "' not found after "
            + testTimeout + " seconds in browser " + label);
      } finally {
        browser.setTimeout(originalTimeout);
        browser.changeTimeout(originalTimeout);
      }
    }
  }

  public void waitWhileElement(String label, Browser browser, String id) throws TimeoutException {
    int originalTimeout = 60;
    try {
      originalTimeout = browser.getTimeout();
      log.debug("Original browser timeout (s): {}, set to 1", originalTimeout);
      browser.setTimeout(1);
      browser.changeTimeout(1);
      new WebDriverWait(browser.getWebDriver(), testTimeout, POLLING_LATENCY)
          .until(ExpectedConditions.invisibilityOfElementLocated(By.id(id)));
    } catch (org.openqa.selenium.TimeoutException e) {
      log.warn("Timeout when waiting for element {} to disappear in browser {}", id, label, e);
      throw new TimeoutException("Element with id='" + id + "' is present in page after "
          + testTimeout + " seconds");
    } finally {
      browser.setTimeout(originalTimeout);
      browser.changeTimeout(originalTimeout);
    }
  }

  /**
   * Wait for stream of another browser user.
   *
   * @param index
   *          own user index
   * @param label
   *          browser name (user name)
   * @param targetIndex
   *          the target user index
   */
  public void waitForStream(int index, String label, int targetIndex) {
    waitForStream(index, label, getBrowserNativeStreamName(targetIndex));
  }

  /**
   * Wait for stream of a fake user.
   *
   * @param index
   *          own user index
   * @param label
   *          browser name (user name)
   * @param targetIndex
   *          the target user index
   */
  public void waitForStreamFake(int index, String label, int targetIndex) {
    waitForStream(index, label, getFakeNativeStreamName(targetIndex));
  }

  /**
   * Wait for stream of user whose video tag has already been generated.
   *
   * @param index
   *          own user index
   * @param label
   *          browser name (user name)
   * @param targetVideoTagId
   *          expected video tag id
   */
  public void waitForStream(int index, String label, String targetVideoTagId) {
    String hostKey = getBrowserKey(index);
    Browser browser = getPage(hostKey).getBrowser();
    int i = 0;
    for (; i < testTimeout; i++) {
      WebElement video = findElement(label, browser, targetVideoTagId);
      String srcAtt = video.getAttribute("src");
      if (srcAtt != null && srcAtt.startsWith("blob")) {
        break;
      }
      try {
        Thread.sleep(1000);
      } catch (InterruptedException e) {
        throw new RuntimeException(e);
      }
    }
    if (i == testTimeout) {
      Assert.fail("Video tag '" + targetVideoTagId + "' is not playing media after " + testTimeout
          + " seconds in '" + hostKey + "'");
    }
  }

  public void verify(boolean[] activeBrowserUsers) {
    verify(activeBrowserUsers, null);
  }

  public void verify(boolean[] activeBrowserUsers, Map<String, Boolean> activeFakeUsers) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < activeBrowserUsers.length; i++) {
      if (activeBrowserUsers[i]) {
        sb.append(USER_BROWSER_PREFIX + i + ": active, ");
      } else {
        sb.append(USER_BROWSER_PREFIX + i + ": not, ");
      }
    }
    log.debug("Checking Browser users (active or not): [{}]", sb);
    if (activeFakeUsers != null && !activeFakeUsers.isEmpty()) {
      log.debug("Checking Fake users (active or not): {}", activeFakeUsers);
    }

    long startTime = System.nanoTime();

    for (int i = 0; i < activeBrowserUsers.length; i++) {

      if (activeBrowserUsers[i]) {
        Browser browser = getPage(getBrowserKey(i)).getBrowser();
        String browserLabel = getBrowserStreamName(i);
        String browserUsername = USER_BROWSER_PREFIX + i;

        for (int j = 0; j < activeBrowserUsers.length; j++) {
          String videoElementId = "video-" + getBrowserStreamName(j);
          verifyVideoInBrowser(browser, browserLabel, browserUsername, videoElementId,
              activeBrowserUsers[j]);
        }

        if (activeFakeUsers != null) {
          for (Entry<String, Boolean> fakeEntry : activeFakeUsers.entrySet()) {
            String videoElementId = "video-" + getFakeStreamName(fakeEntry.getKey());
            verifyVideoInBrowser(browser, browserLabel, browserUsername, videoElementId,
                fakeEntry.getValue());
          }
        }
      }
    }
    long endTime = System.nanoTime();
    double duration = ((double) endTime - startTime) / 1_000_000;
    log.debug("Checked active users: [{}] {} - in {} millis", sb, activeFakeUsers != null
        && !activeFakeUsers.isEmpty() ? "& " + activeFakeUsers : "", duration);
  }

  public void verifyVideoInBrowser(Browser browser, String browserLabel, String chromeName,
      String videoElementId, boolean isActive) {
    if (isActive) {
      log.debug("Verifing element {} exists in browser of {}", videoElementId, chromeName);
      try {
        WebElement video = findElement(browserLabel, browser, videoElementId);
        if (video == null) {
          fail("Video element " + videoElementId + " was not found in browser of " + chromeName);
        }
      } catch (NoSuchElementException e) {
        fail(e.getMessage());
      }
      log.debug("OK - element {} found in browser of {}", videoElementId, chromeName);
    } else {
      log.debug("Verifing element {} is missing from browser of {}", videoElementId, chromeName);
      try {
        waitWhileElement(browserLabel, browser, videoElementId);
      } catch (TimeoutException e) {
        fail(e.getMessage());
      }
      log.debug("OK - element {} is missing from browser of {}", videoElementId, chromeName);
    }
  }

  public void failWithExceptions() {
    if (!failed && !execExceptions.isEmpty()) {
      failed = true;
      StringBuffer sb = new StringBuffer();
      log.warn("\n+-------------------------------------------------------+\n"
          + "|   Failing because of the following test errors:       |\n"
          + "+-------------------------------------------------------+");
      for (String exKey : execExceptions.keySet()) {
        Exception e = execExceptions.get(exKey);
        log.warn("Error on '{}'", exKey, e);
        sb.append(exKey).append(" - ").append(e.getMessage()).append("\n");
      }
      sb.append("Check logs for more details");
      log.warn("\n+-------------------------------------------------------+\n"
          + "|   End of errors list                                  |\n"
          + "+-------------------------------------------------------+");
      Assert.fail(sb.toString());
    }
  }
}
