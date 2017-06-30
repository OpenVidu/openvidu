package io.openvidu.test.e2e.stepdefinition;

import static org.junit.Assert.assertTrue;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.ConcurrentHashMap;

import org.junit.Assert;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

import cucumber.api.java.en.And;
import cucumber.api.java.en.Given;
import cucumber.api.java.en.Then;
import cucumber.api.java.en.When;
import io.openvidu.test.e2e.cucumbertest.BrowserUser;
import io.openvidu.test.e2e.cucumbertest.ChromeUser;
import io.openvidu.test.e2e.cucumbertest.FirefoxUser;

public class StepsConnectingToSession {

	public final int numDrivers = 2;
	public Map<String, BrowserUser> browserUsers = new ConcurrentHashMap<>();

	@Given("^Chrome users (.+)  and Firefox users (.+) go to \"([^\"]*)\" page with (.+) seconds$")
	public void chrome_users_and_firefox_users_go_to_something_page_with_seconds(String chromeusers,
			String firefoxusers, String strArg1, String secondsOfWait) throws Throwable {

		// List of Chrome users
		List<String> chromeNames = fromArrayStringifyToList(chromeusers);

		// List of Firefox users
		List<String> firefoxNames = fromArrayStringifyToList(firefoxusers);

		for (String name : chromeNames) {
			browserUsers.put(name, new ChromeUser(name, Integer.parseInt(secondsOfWait)));
		}
		for (String name : firefoxNames) {
			browserUsers.put(name, new FirefoxUser(name, Integer.parseInt(secondsOfWait)));
		}

		for (BrowserUser user : this.browserUsers.values()) {
			user.navigateTo(strArg1);
		}
	}

	@When("^users click on \"([^\"]*)\" button$")
	public void users_click_on_something_button(String strArg1) throws Throwable {
		for (BrowserUser user : browserUsers.values()) {
			user.getDriver().findElement(By.name(strArg1)).click();
		}
	}

	@Then("^users should see title (.+) in element with id \"([^\"]*)\"$")
	public void users_should_see_title_in_element_with_id_something(String session, String strArg1) throws Throwable {
		for (BrowserUser user : browserUsers.values()) {
			Assert.assertTrue(user.getWaiter().until(ExpectedConditions
					.textToBePresentInElement(user.getDriver().findElement(By.id(strArg1)), session)));
		}
	}

	@And("^users fill \"([^\"]*)\" input$")
	public void users_fill_something_input(String strArg1) throws Throwable {
		for (Entry<String, BrowserUser> entry : this.browserUsers.entrySet()) {
			WebElement nicknameInput = entry.getValue().getDriver().findElement(By.id(strArg1));
			nicknameInput.clear();
			nicknameInput.sendKeys(entry.getKey());
		}
	}

	@And("^users fill \"([^\"]*)\" input with session name (.+)$")
	public void users_fill_something_input_with_session_name(String session, String strArg1) throws Throwable {
		for (BrowserUser user : this.browserUsers.values()) {
			WebElement sessionInput = user.getDriver().findElement(By.id(session));
			sessionInput.clear();
			sessionInput.sendKeys(strArg1);
		}
	}

	@And("^\"([^\"]*)\" video element/s should be shown in element with id \"([^\"]*)\"$")
	public void something_video_elements_should_be_shown_in_element_with_id_something(String strArg1, String strArg2)
			throws Throwable {
		for (BrowserUser user : this.browserUsers.values()) {
			new Thread(() -> {
				By byXpath = By.xpath("//div[(@id='" + strArg2 + "')]/video");
				user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(byXpath, Integer.parseInt(strArg1)));
			}).run();
		}
	}

	@And("^\"([^\"]*)\" video element/s in \"([^\"]*)\" should be playing media$")
	public void something_video_elements_in_something_should_be_playing_media(String strArg1, String strArg2)
			throws Throwable {
		By byXpath = By.xpath("//div[(@id='" + strArg2 + "')]/video");
		for (BrowserUser user : this.browserUsers.values()) {
			new Thread(() -> {
				List<WebElement> videos = user.getDriver().findElements(byXpath);
				int numOfVideosPlaying = 0;
				for (int i = 0; i < videos.size(); i++) {
					if (this.checkVideoPlaying(user, videos.get(i), strArg2)) {
						numOfVideosPlaying++;
					}
				}
				Assert.assertEquals(numOfVideosPlaying, Integer.parseInt(strArg1));
			}).run();
		}
	}

	@And("^all video elements should be shown in element with id \"([^\"]*)\"$")
	public void all_video_elements_should_be_shown_in_element_with_id_something(String strArg1) throws Throwable {
		for (BrowserUser user : this.browserUsers.values()) {
			new Thread(() -> {
				By byXpath = By.xpath("//div[(@id='" + strArg1 + "')]/video");
				user.getWaiter().until(ExpectedConditions.numberOfElementsToBe(byXpath, this.browserUsers.size() - 1));
			}).run();
		}
	}

	@And("^all video elements in \"([^\"]*)\" should be playing media$")
	public void all_video_elements_in_something_should_be_playing_media(String strArg1) throws Throwable {
		By byXpath = By.xpath("//div[(@id='" + strArg1 + "')]/video");
		for (BrowserUser user : this.browserUsers.values()) {
			new Thread(() -> {
				List<WebElement> videos = user.getDriver().findElements(byXpath);
				int numOfVideosPlaying = 0;
				for (int i = 0; i < videos.size(); i++) {
					if (this.checkVideoPlaying(user, videos.get(i), strArg1)) {
						numOfVideosPlaying++;
					}
				}
				Assert.assertEquals(numOfVideosPlaying, this.browserUsers.size() - 1);
			}).run();
		}
	}

	@Then("^users should see other users nicknames in paragraph element$")
	public void users_should_see_other_users_nicknames_in_paragraph_element() throws Throwable {
		for (BrowserUser user : this.browserUsers.values()) {
			new Thread(() -> {
				for (Entry<String, BrowserUser> entry : this.browserUsers.entrySet()) {
					if (entry.getValue().getUserName() != user.getUserName()) {
						By byXpath = By.xpath("//div[(@id='subscriber')]/p[@id='data-" + entry.getKey() + "']");
						user.getWaiter().until(ExpectedConditions.textToBePresentInElementLocated(byXpath, entry.getKey()));
					}
				}
			}).run();
		}
	}

	@And("^(.+) leave session$")
	public void leave_session(String firefoxusers) throws Throwable {
		List<String> firefoxUsers = this.fromArrayStringifyToList(firefoxusers);
		for (String user : firefoxUsers) {
			new Thread(() -> {
				this.browserUsers.get(user).getDriver().findElement(By.id("buttonLeaveSession")).click();
			}).run();
		}
	}

	@And("^(.+) see \"([^\"]*)\" text in \"([^\"]*)\" element$")
	public void see_something_text_in_something_element(String firefoxusers, String strArg1, String strArg2)
			throws Throwable {
		List<String> firefoxUsers = this.fromArrayStringifyToList(firefoxusers);
		for (String user : firefoxUsers) {
			Assert.assertEquals((this.browserUsers.get(user).getDriver().findElement(By.tagName(strArg2)).getText()),
					strArg1);
		}
	}

	@And("^(.+) div \"([^\"]*)\" should have (.+) videos$")
	public void div_something_should_have_videos(String usersInRoom, String strArg1, String usersInRoom2)
			throws Throwable {
		for (BrowserUser user : this.browserUsers.values()) {
			new Thread(() -> {
				List<String> users = this.fromArrayStringifyToList(usersInRoom);
				if (users.contains(user.getUserName())) {
					for (String u : users) {
						if (!u.equals(user.getUserName())) {
							By byXpath = By
									.xpath("//div[(@id='" + strArg1 + "')]/video[@id='native-video-" + u + "_webcam']");
							user.getWaiter().until(ExpectedConditions.presenceOfElementLocated(byXpath));
						}
					}
				}
			}).run();
		}
	}

	@And("^close all browsers$")
	public void close_all_browsers() throws Throwable {
		for (BrowserUser user : this.browserUsers.values()) {
			user.getDriver().quit();
		}
	}

	private List<String> fromArrayStringifyToList(String arrayStringify) {
		String[] tokens = arrayStringify.substring(2, arrayStringify.length() - 2).split("'(\\s)*,(\\s)*'");
		return Arrays.asList(tokens);
	}

	private boolean checkVideoPlaying(BrowserUser user, WebElement videoElement, String containerId) {

		// Video element should be in 'readyState'='HAVE_ENOUGH_DATA'
		//user.getWaiter().until(ExpectedConditions.attributeToBe(videoElement, "readyState", "4"));
		// Video should have a valid 'src' value
		user.getWaiter().until(ExpectedConditions.attributeToBeNotEmpty(videoElement, "src"));
		// Video should have a srcObject (type MediaStream) with the
		// attribute 'active' to true
		Boolean activeSrcObject = (Boolean) user.runJavascript("return document.getElementById('" + containerId
				+ "').getElementsByTagName('video')[0].srcObject.active");
		Assert.assertTrue(activeSrcObject);
		// Video should trigger 'playing' event
		user.runJavascript("document.getElementById('" + videoElement.getAttribute("id")
				+ "').addEventListener('playing', window.MY_FUNC('" + containerId + "'))");
		user.getWaiter()
				.until(ExpectedConditions.textToBePresentInElement(
						user.getDriver().findElement(By.id(containerId + "-video-is-playing")),
						containerId + " VIDEO PLAYING"));
		user.runJavascript(
				"document.body.removeChild(document.getElementById('" + containerId + "-video-is-playing'))");

		return true;
	}

}
