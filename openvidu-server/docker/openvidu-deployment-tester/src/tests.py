import utils
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By

def basic_test(args):
    print("Running basic test with args:", args)
    driver = utils.runBrowser(args.browser, args.turn)
    if args.openvidu_edition == "ce":
        url_test = args.openvidu_url + '/dashboard'
        driver.get(url_test)

        elem = driver.find_element(By.ID,'test-btn')
        elem.send_keys(Keys.RETURN)

        elem = driver.find_element(By.NAME, 'secret')
        elem.send_keys(args.openvidu_secret)

        elem = driver.find_element(By.ID, 'join-btn')
        elem.send_keys(Keys.RETURN)
    elif args.openvidu_edition == "pro":
        url_test = args.openvidu_url + '/inspector'
        driver.get(url_test)

        elem = driver.find_element(By.ID, 'secret-input')
        elem.send_keys(args.openvidu_secret)

        elem = driver.find_element(By.ID, 'login-btn')
        elem.send_keys(Keys.RETURN)

        # print('data:image/png;base64,' + self.driver.get_screenshot_as_base64())
        elem = driver.find_element(By.ID,'menu-test-btn')
        elem.send_keys(Keys.RETURN)

        elem = driver.find_element(By.ID,'test-btn')
        elem.send_keys(Keys.RETURN)
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
        # print('data:image/png;base64,' + driver.get_screenshot_as_base64())
        if args.browser == "firefox":
            utils.print_candidates(driver)

    if video_error == True:
        raise Exception('Error. No video detected')