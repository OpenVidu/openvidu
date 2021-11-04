from openvidu_health_check import InfraSmokeTests

if __name__ == '__main__':
    try:
        init_obj = InfraSmokeTests()
        init_obj.runChrome()
    except:
        print("Chrome web driver downloaded")
    try:
        init_obj.runFirefox()
    except:
        print("Firefox web driver downloaded")
