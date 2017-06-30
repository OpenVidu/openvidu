package io.openvidu.test.e2e.cucumbertest;

import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.WebDriverWait;

public class BrowserUser {

	protected WebDriver driver;
	protected WebDriverWait waiter;
	protected String userName;
	
	private int timeOfWait;
	
	public BrowserUser(String userName, int timeOfWait) {
		this.userName = userName;
		this.timeOfWait = timeOfWait;
	}

	public WebDriver getDriver() {
		return this.driver;
	}

	public WebDriverWait getWaiter() {
		return this.waiter;
	}
	
	public String getUserName() {
		return this.userName;
	}
	
	public Object runJavascript(String script, Object... args) {
		return ((JavascriptExecutor)this.driver).executeScript(script, args);
	}
	
	public void navigateTo(String url){
		this.driver.get(url);
		
		String scriptAppend = "var s = document.createElement('script'); " + "s.type = 'text/javascript';"
				+ "s.innerHTML = arguments[0];" + "document.body.appendChild(s);";

		String scriptContent = "window['MY_FUNC']= function(videoOwner) { "
				+ "var elem = document.createElement('div');" + "elem.id = videoOwner + '-video-is-playing';"
				+ "document.body.appendChild(elem); "
				+ "document.getElementById(videoOwner + '-video-is-playing').innerHTML = (videoOwner + ' VIDEO PLAYING')"
				+ "}";
		this.runJavascript(scriptAppend, scriptContent);
	}

	protected void configWaiterAndScript() {
		this.waiter = new WebDriverWait(this.driver, this.timeOfWait);
	}
}
