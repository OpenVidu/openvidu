#!/usr/bin/python3
import unittest
import requests
from selenium import webdriver
from selenium.webdriver import firefox
from selenium.webdriver.firefox import service
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager
from selenium.webdriver.chrome import options
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
from prettytable import from_html_one
import time
import os

class InfraSmokeTests(unittest.TestCase):

    def setUp(self):
        print('Executing test... Please wait...')
        self.openvidu_url = os.getenv('OV_URL')
        self.openvidu_password = os.getenv('OV_SECRET')
        self.is_openvidu_ce = self.check_is_openvidu_ce()
        if self.is_openvidu_ce:
            self.inject_basic_auth_in_url()
        self.driver = None

    def test_chrome_no_relay(self):
        self.inspector_check(browser="chrome")

    def test_firefox_no_relay(self):
        self.inspector_check(browser="firefox")

    def test_firefox_force_relay(self):
        self.inspector_check(browser="firefox", turn=True)

    def inspector_check(self, browser="chrome", turn=False):
        print('\n\n======================================================================')
        print('|')
        print('|')
        print('|   Testing OpenVidu ' + ('CE ' if self.is_openvidu_ce else 'PRO/ENTERPRISE ') + 'with ' + browser + ' and force relay: ' + str(turn))
        print('|')
        print('|')
        print('======================================================================')
        if self.openvidu_url == None or self.openvidu_password == None:
            raise(Exception("You must specify OV_URL and OV_SECRET environment variables"))
        if browser == "chrome":
            self.runChrome()
        else:
            self.runFirefox(turn)

        if self.is_openvidu_ce:
            url_test = self.openvidu_url + '/dashboard'
            self.driver.get(url_test)

            elem = self.driver.find_element(By.ID,'test-btn')
            elem.send_keys(Keys.RETURN)

            elem = self.driver.find_element(By.NAME, 'secret')
            elem.send_keys(self.openvidu_password)

            elem = self.driver.find_element(By.ID, 'join-btn')
            elem.send_keys(Keys.RETURN)

        else:
            url_test = self.openvidu_url + '/inspector'
            self.driver.get(url_test)

            elem = self.driver.find_element(By.ID, 'secret-input')
            elem.send_keys(self.openvidu_password)

            elem = self.driver.find_element(By.ID, 'login-btn')
            elem.send_keys(Keys.RETURN)

            # print('data:image/png;base64,' + self.driver.get_screenshot_as_base64())
            elem = self.driver.find_element(By.ID,'menu-test-btn')
            elem.send_keys(Keys.RETURN)

            elem = self.driver.find_element(By.ID,'test-btn')
            elem.send_keys(Keys.RETURN)

        video_error = False
        try:
            self.driver.find_element(By.XPATH, "//*[contains(text(), 'Stream playing')]")
            print('Video detected.\n')
        except:
            video_error = True
        finally:
            # print('data:image/png;base64,' + self.driver.get_screenshot_as_base64())
            if browser == "firefox":
                self.print_candidates()

        if video_error == True:
            raise Exception('Error. No video detected')

        self.driver.switch_to.window(self.driver.window_handles[0])
        elem = self.driver.find_element(By.ID,'test-btn')
        elem.send_keys(Keys.RETURN)

        self.closeBrowser()
        print('Sucess with ' + browser + ' and Force Turn: ' + str(turn) + '\n')
        print('----------------------------------------------------------------------\n')

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
        self.options.set_preference('media.navigator.permission.disabled', False)
        self.options.set_preference('media.navigator.streams.fake', True)
        self.options.set_preference('media.peerconnection.enabled', True)
        self.options.set_preference('media.peerconnection.ice.obfuscate_host_addresses', False)
        self.options.set_preference('media.peerconnection.identity.enabled', True)
        self.options.set_preference('media.peerconnection.mtransport_process', True)
        self.options.set_preference('media.peerconnection.ice.no_host', False)
        self.options.set_preference('network.process.enabled', True)
        self.options.set_preference('media.peerconnection.ice.relay_only', turn)
        self.options.set_preference('media.peerconnection.turn.disable', not turn)

        self.driver = webdriver.Firefox(
            service=FirefoxService(GeckoDriverManager().install()),
            options = self.options)
        self.driver.implicitly_wait(15)
        self.driver.maximize_window()

    def check_is_openvidu_ce(self):
        response = requests.get(self.openvidu_url + "/dashboard")
        if response.status_code == 401:
            return True
        else:
            return False

    def inject_basic_auth_in_url(self):
        separator = "://"
        basic_auth_url_str = "OPENVIDUAPP:" + self.openvidu_password + "@"
        split_url = self.openvidu_url.split(separator)
        self.openvidu_url = split_url[0] + separator + basic_auth_url_str + split_url[1]


    def print_candidates(self):
        try:
            # New tab
            self.driver.execute_script("window.open('');")
            # Switch to the new window
            self.driver.switch_to.window(self.driver.window_handles[1])
            # Open about:webrtc
            self.driver.get('about:webrtc')
            peer_conn_elems = self.driver.find_elements(By.CLASS_NAME, "peer-connection")
            for peer_conn in peer_conn_elems:
                show_details_elems = peer_conn.find_elements(By.XPATH, "//*[contains(text(), 'show details')]")
                for show_details in show_details_elems:
                    show_details.click()

            print("Waiting for candidates to be checked...")
            # Get ice stats
            time.sleep(15)
            # about:webrtc page refreshes each second, so we need to
            # safe the entire HTML in a variable to have a Snapshot of the situation
            about_webrtc_html = '<html>' + self.driver.find_element(By.TAG_NAME, 'html').get_attribute('innerHTML') + '</html>'
            # Search the tables using a parser and print all candidates
            soup = BeautifulSoup(about_webrtc_html, 'html.parser')
            for caption in soup.findAll('caption', {'data-l10n-id' : 'about-webrtc-trickle-caption-msg'}):
                print(from_html_one(str(caption.parent)))
            # Close about:webrtc
            self.driver.close()
        except:
            print('[Warn] Some candidates may not appear in test result')

    def closeBrowser(self):
        # close the browser window
        self.driver.close()
        self.driver.quit()

if __name__ == '__main__':
    unittest.main()
