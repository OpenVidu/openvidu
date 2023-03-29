import utils
import time
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from requests.auth import HTTPBasicAuth
import requests

def basic_test(args):
    print("Running basic test with args:", args)
    driver = utils.runBrowser(args.browser, args.turn)
    base_url = args.openvidu_url

    if args.openvidu_edition == "ce":
        driver.get(f"{base_url}/dashboard")
        driver.find_element(By.ID, 'test-btn').send_keys(Keys.RETURN)
        driver.find_element(By.NAME, 'secret').send_keys(args.openvidu_secret)
        driver.find_element(By.ID, 'join-btn').send_keys(Keys.RETURN)
    elif args.openvidu_edition == "pro":
        driver.get(f"{base_url}/inspector")
        driver.find_element(By.ID, 'secret-input').send_keys(args.openvidu_secret)
        driver.find_element(By.ID, 'login-btn').send_keys(Keys.RETURN)
        driver.find_element(By.ID, 'menu-test-btn').send_keys(Keys.RETURN)
        driver.find_element(By.ID, 'test-btn').send_keys(Keys.RETURN)
    else:
        print("Error: Invalid OpenVidu edition specified")
        exit(1)

    video_error = False
    try:
        driver.find_element(By.XPATH, "//*[contains(text(), 'Stream playing')]")
        print('Video detected.\n')
    except:
        video_error = True
    finally:
        if args.browser == "firefox":
            utils.print_candidates(driver)

    if video_error:
        raise Exception('Error. No video detected')

def call_recording_test(args):
    print("Testing recording with OpenVidu Call with args:", args)
    driver = utils.runBrowser(args.browser, args.turn)
    driver.get(args.openvidu_call_url)

    utils.call_login(driver, args.openvidu_call_username, args.openvidu_call_password)
    session_name = utils.call_session(driver, args.number_of_clients)

    print('Starting recording')
    driver.find_element(By.ID, 'activities-panel-btn').send_keys(Keys.RETURN)
    time.sleep(5)
    driver.find_element(By.ID, 'mat-expansion-panel-header-0').send_keys(Keys.RETURN)
    time.sleep(5)
    driver.find_element(By.ID, 'start-recording-btn').send_keys(Keys.RETURN)

    print('Recording started')
    time.sleep(10)

    print('Stopping recording')
    driver.find_element(By.ID, 'stop-recording-btn').send_keys(Keys.RETURN)
    print('Recording stopped')
    time.sleep(5)

    print(f'Downloading recording from {args.openvidu_url}/openvidu/recordings/{session_name}/{session_name}.mp4')
    url = f'{args.openvidu_url}/openvidu/recordings/{session_name}/{session_name}.mp4'

    if args.browser == "chrome":
        print("Checking if recording is green (Default video color from chrome emulated video is green)")
        is_green = utils.is_video_green(url, HTTPBasicAuth('OPENVIDUAPP', args.openvidu_secret), f'{session_name}.mp4')
        is_video_valid = utils.is_video_valid(url, HTTPBasicAuth('OPENVIDUAPP', args.openvidu_secret), f'{session_name}.mp4')
        print("Recording is", "green" if is_green else "not green")
        if not is_green or not is_video_valid:
            exit(1)
    elif args.browser == "firefox":
        # Close all tabs
        print("Checking if recording is a valid video")
        is_valid = utils.is_video_valid(url, HTTPBasicAuth('OPENVIDUAPP', args.openvidu_secret), f'{session_name}.mp4')
        print("Recording is", "valid" if is_valid else "not valid")
        if not is_valid:
            exit(1)

    print('Removing recording')
    url = f'{args.openvidu_url}/openvidu/api/recordings/stop/{session_name}'
    requests.delete(url, auth=HTTPBasicAuth('OPENVIDUAPP', args.openvidu_secret), verify=False)

    utils.close_all_tabs(driver, args.browser)

def call_test(args):
    print(f"Testing recording with OpenVidu Call with args: {args}")
    driver = utils.runBrowser(args.browser, args.turn)
    driver.get(args.openvidu_call_url)

    utils.call_login(driver, args.openvidu_call_username, args.openvidu_call_password)
    utils.call_session(driver, args.number_of_clients)
    time.sleep(5)

    videos = driver.find_elements(By.TAG_NAME, 'video')

    if len(videos) != args.number_of_clients:
        raise Exception('Error. Number of videos is not equal to number of clients')

    for i, video in enumerate(videos):
        current_time = float(video.get_attribute('currentTime'))
        print(f'Video {i} is playing. Current time: {current_time}')
        if current_time < 1:
            raise Exception('Error. Video is not playing')
    utils.close_all_tabs(driver, args.browser)