#!/usr/bin/python3
import unittest
from selenium import webdriver
from selenium.webdriver.firefox import service
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager
from selenium.webdriver.chrome import options
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
import time
import os

class InfraSmokeTests(unittest.TestCase):

    def setUp(self):
        self.openvidu_url = os.getenv('OV_URL')
        self.openvidu_password = os.getenv('OV_SECRET')
        self.driver = None

    def test_inspector(self):
        self.inspector_check(browser="chrome")
        self.inspector_check(browser="firefox")
        self.inspector_check(browser="firefox", turn=True)

    def inspector_check(self, browser="chrome", turn=False):
        if browser == "chrome":
            self.runChrome()
        else:
            self.runFirefox(turn)
        print ('Testing OpenVidu Inspector test')

        url_test = self.openvidu_url + '/inspector'
        self.driver.get(url_test)

        elem = self.driver.find_element(By.ID, 'secret-input')
        elem.send_keys(self.openvidu_password)

        elem = self.driver.find_element(By.ID, 'login-btn')
        elem.send_keys(Keys.RETURN)

        time.sleep(10)
        print('data:image/png;base64,' + self.driver.get_screenshot_as_base64())
        elem = self.driver.find_element(By.ID,'menu-test-btn')
        elem.send_keys(Keys.RETURN)

        elem = self.driver.find_element(By.ID,'test-btn')
        elem.send_keys(Keys.RETURN)

        self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Stream playing')]")
        print('data:image/png;base64,' + self.driver.get_screenshot_as_base64())

        print('Video detected.')
        elem = self.driver.find_element(By.ID,'test-btn')
        elem.send_keys(Keys.RETURN)

        print('Test success')
        self.closeBrowser()

    def runChrome(self):
        self.options = webdriver.ChromeOptions()
        self.options.add_argument("--use-fake-ui-for-media-stream")
        self.options.add_argument("--disable-infobars")
        self.options.add_argument("--ignore-certificate-errors")
        self.options.add_argument("--start-maximized")
        self.options.add_argument("--use-fake-device-for-media-stream")
        self.options.add_argument("--no-sandbox")

        self.driver = webdriver.Chrome(
            service=ChromeService(ChromeDriverManager().install()),
            options = self.options)
        self.driver.implicitly_wait(15)

    def runFirefox(self, turn=False):
        print("Running firefox with Turn: ", turn)
        self.options = webdriver.FirefoxOptions()
        self.options.set_preference('media.navigator.permission.disabled', True)
        self.options.set_preference('media.navigator.streams.fake', True)
        if turn:
            self.options.set_preference('media.peerconnection.ice.relay_only', True)

        self.driver = webdriver.Firefox(
            service=FirefoxService(GeckoDriverManager().install()),
            options = self.options)
        self.driver.implicitly_wait(15)
        self.driver.maximize_window()

    def closeBrowser(self):
        # close the browser window
        self.driver.close()
        self.driver.quit()

if __name__ == '__main__':
    unittest.main()
