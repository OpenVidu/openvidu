import time
import os
import cv2
import numpy as np
import requests
import subprocess

from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium import webdriver
from bs4 import BeautifulSoup
from prettytable import from_html_one

def install_drivers(chrome_version, gecko_version):
    print("Downloading drivers...")
    # Download Chrome driver
    chrome_driver_manager = ChromeDriverManager(version=chrome_version)
    chrome_driver_manager.install()

    # Download Firefox driver
    firefox_driver_manager = GeckoDriverManager(version=gecko_version)
    firefox_driver_manager.install()

    with open("chrome_version", "w") as f:
        f.write(chrome_driver_manager.driver.get_version())
    with open("gecko_version", "w") as f:
        f.write(firefox_driver_manager.driver.get_version())

def authenticated_url(openvidu_url, openvidu_secret):
    separator = "://"
    basic_auth_url_str = "OPENVIDUAPP:" + openvidu_secret + "@"
    split_url = openvidu_url.split(separator)
    return split_url[0] + separator + basic_auth_url_str + split_url[1]

def runBrowser(browser, turn=False):
    driver=None
    if browser == "chrome":
        driver = runChrome()
    else:
        driver = runFirefox(turn)
    driver.maximize_window()
    driver.implicitly_wait(10)
    return driver

def runChrome():
    driver_location = os.environ.get("CHROME_DRIVER_LOCATION")

    # Load version from file
    chrome_version = None

    # Check if chrome version file exists and load it
    if os.path.isfile("chrome_version"):
        with open("chrome_version", "r") as f:
            chrome_version = f.read()

    print("Running chrome...")
    print("Chrome version: ", chrome_version)
    options = webdriver.ChromeOptions()
    options.add_argument("--use-fake-ui-for-media-stream")
    options.add_argument("--disable-infobars")
    options.add_argument("--ignore-certificate-errors")
    options.add_argument("--start-maximized")
    options.add_argument("--use-fake-device-for-media-stream")
    options.add_argument("--no-sandbox")

    return webdriver.Chrome(
        service=ChromeService(ChromeDriverManager(path=driver_location, version=chrome_version).install()),
        options = options)

def runFirefox(turn=False):
    driver_location = os.environ.get("GECKO_DRIVER_LOCATION")

    # Load version from file
    gecko_version = None

    # Check if gecko version file exists and load it
    if os.path.isfile("gecko_version"):
        with open("gecko_version", "r") as f:
            gecko_version = f.read()

    print("Running firefox with Turn: ", turn)
    print("Gecko version: ", gecko_version)
    options = webdriver.FirefoxOptions()
    options.set_preference('media.navigator.permission.disabled', True)
    options.set_preference('media.navigator.streams.fake', True)
    options.set_preference('media.peerconnection.enabled', True)
    options.set_preference('media.peerconnection.ice.obfuscate_host_addresses', False)
    options.set_preference('media.peerconnection.identity.enabled', True)
    options.set_preference('media.peerconnection.mtransport_process', True)
    options.set_preference('media.peerconnection.ice.no_host', False)
    options.set_preference('network.process.enabled', True)
    options.set_preference('media.peerconnection.ice.relay_only', turn)
    options.set_preference('media.peerconnection.turn.disable', not turn)

    return webdriver.Firefox(
        service=FirefoxService(GeckoDriverManager(path=driver_location, version=gecko_version).install()),
        options = options)

def print_candidates(driver):
    try:
        # New tab
        driver.execute_script("window.open('');")
        # Switch to the new window
        driver.switch_to.window(driver.window_handles[1])
        # Open about:webrtc
        driver.get('about:webrtc')
        peer_conn_elems = driver.find_elements(By.CLASS_NAME, "peer-connection")
        for peer_conn in peer_conn_elems:
            show_details_elems = peer_conn.find_elements(By.XPATH, "//*[contains(text(), 'show details')]")
            for show_details in show_details_elems:
                show_details.click()

        print("Waiting for candidates to be checked...")
        # Get ice stats
        time.sleep(15)
        # about:webrtc page refreshes each second, so we need to
        # safe the entire HTML in a variable to have a Snapshot of the situation
        about_webrtc_html = '<html>' + driver.find_element(By.TAG_NAME, 'html').get_attribute('innerHTML') + '</html>'
        # Search the tables using a parser and print all candidates
        soup = BeautifulSoup(about_webrtc_html, 'html.parser')
        for caption in soup.findAll('caption', {'data-l10n-id' : 'about-webrtc-trickle-caption-msg'}):
            print(from_html_one(str(caption.parent)))
        # Close about:webrtc
        driver.close()
        driver.switch_to.window(driver.window_handles[0])
        driver.close()
    except:
        print('[Warn] Some candidates may not appear in test result')
        driver.switch_to.window(driver.window_handles[0])
        driver.close()

def call_session(driver, num_of_clients):
    print('First session entering')
    session_name = driver.find_element(By.ID, 'session-name-input').get_attribute('value')
    driver.find_element(By.ID, 'join-btn').send_keys(Keys.RETURN)

    print('Joining user 1 to session', session_name)
    driver.find_element(By.ID, 'join-button').send_keys(Keys.RETURN)
    url_link = driver.current_url

    for i in range(2, num_of_clients + 1):
        print(f'Joining user {i} to session {session_name}')
        driver.execute_script(f'window.open("{url_link}", "_blank");')
        driver.switch_to.window(driver.window_handles[-1])
        driver.find_element(By.ID, 'join-button').send_keys(Keys.RETURN)
        time.sleep(5)

    driver.switch_to.window(driver.window_handles[0])
    return session_name

def call_login(driver, username, password):
    print('Logging in')
    driver.find_element(By.NAME, 'username').send_keys(username)
    driver.find_element(By.NAME, 'password').send_keys(password)
    driver.find_element(By.ID, 'join-btn').send_keys(Keys.RETURN)

def close_all_tabs(driver, browser):
    if browser == 'firefox':
        # Close all tabs
        for i in range(0, len(driver.window_handles)):
            driver.switch_to.window(driver.window_handles[0])
            driver.close()
            time.sleep(1)

def is_video_green(url, basic_auth, video_filename):
    # Download the video from the URL
    response = requests.get(url, auth=basic_auth, verify=False)
    open(video_filename, 'wb').write(response.content)

    # Read the video using OpenCV
    cap = cv2.VideoCapture(video_filename)

    # Parameters to calculate if the video is mostly green
    total_frames = 0
    green_frames = 0
    green_threshold = 0.8

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        total_frames += 1

        # Define green ranges in the RGB color space
        lower_green = np.array([0, 100, 0])
        upper_green = np.array([100, 255, 100])

        # Create a mask to select only green pixels
        mask = cv2.inRange(frame, lower_green, upper_green)

        # Calculate the percentage of green pixels in the frame
        green_ratio = np.sum(mask == 255) / (mask.shape[0] * mask.shape[1])

        if green_ratio > green_threshold:
            green_frames += 1

    # Clean up resources
    cap.release()

    # Remove the video file
    os.remove(video_filename)

    # Determine if the video is mostly green
    return green_frames / total_frames > 0.8

def is_video_valid(url, basic_auth, video_filename):
    response = requests.get(url, auth=basic_auth, verify=False)
    open(video_filename, 'wb').write(response.content)
    try:
        cmd = ["ffprobe", "-v", "error", "-show_streams", "-select_streams", "v:0", video_filename]
        output = subprocess.check_output(cmd, stderr=subprocess.STDOUT)
        if output:
            return True
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")
    finally:
        os.remove(video_filename)