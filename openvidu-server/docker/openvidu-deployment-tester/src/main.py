import cli_utils
import utils

import tests

# Define your commands here
def install_drivers(args):
    utils.install_drivers(args.chrome_version, args.gecko_version)

# Define the command-line arguments
parser = cli_utils.initialize_parser()

# Parse the command-line arguments and call the appropriate command with its arguments
args = parser.parse_args()
if hasattr(args, "openvidu_url") and args.openvidu_url.endswith("/"):
    args.openvidu_url = args.openvidu_url[:-1]
if hasattr(args, "openvidu_secret"):
    args.openvidu_url = utils.authenticated_url(args.openvidu_url, args.openvidu_secret)
if args.command == "install-drivers":
    install_drivers(args)
elif args.command == "basic-test":
    tests.basic_test(args)
elif args.command == "call-test-recording":
    tests.call_recording_test(args)
elif args.command == "call-test":
    tests.call_test(args)
else:
    print("Error: No command specified")