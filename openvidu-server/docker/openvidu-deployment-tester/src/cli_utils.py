import argparse

def install_drivers_parser(subparsers):
    install_drivers_parser = subparsers.add_parser("install-drivers")
    install_drivers_parser.add_argument("--chrome-version", required=False, help="Chrome version to install (e.g. 87.0.4280.88")
    install_drivers_parser.add_argument("--gecko-version", required=False, help="Gecko version to install (e.g. 0.29.1")

def test_parser(subparsers, command):
    test_parser = subparsers.add_parser(command)
    test_parser.add_argument("--openvidu-url", required=True, help="OpenVidu URL to test")
    test_parser.add_argument("--openvidu-secret", required=True, help="OpenVidu secret used for OpenVidu API")
    if command == "basic-test":
        test_parser.add_argument("--openvidu-edition", required=True, choices=["ce", "pro", "enterprise"], help="OpenVidu edition to test")
        test_parser.add_argument("--browser", required=True, choices=["chrome", "firefox"], help="Browser to test")
        test_parser.add_argument("--turn", required=False, default=False, action='store_true', help="Force TURN usage. Only available for Firefox")
    elif command == "recording-test":
        test_parser.add_argument("--openvidu-call-url", required=True, help="OpenVidu Call URL to test")

def initialize_parser():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command")

    install_drivers_parser(subparsers)
    test_parser(subparsers, "basic-test")

    return parser

def print_args(args):
    print("Executing command: " + args.command)
    for arg, value in vars(args).items():
        if arg != 'command':
            if arg == 'openvidu-secret':
                value = '********'
            print(f"\t{arg}: {value}")