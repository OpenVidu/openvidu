package io.openvidu.server.utils;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.HashSet;
import java.util.Scanner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class GameServerIP {
  private static final Logger log = LoggerFactory.getLogger(GameServerIP.class);
  private static GameServerIP _instance = null;
  private static HashSet<String> ips = null;

  public static GameServerIP getInstance() {
    if (_instance == null) {
      _instance = new GameServerIP();
      ips = new HashSet<String>();
      loadIPs();
    }
    return _instance;
  }

  private GameServerIP() {
  }

  private static void loadIPs() {
    try {
      File file = new File("/usr/local/bin/gameserver_ips.txt");

      Scanner scanner = new Scanner(file);
      while (scanner.hasNextLine()) {
        String line = scanner.nextLine();
        ips.add(line);
      }
      scanner.close();
    } catch (FileNotFoundException e) {
      log.error("Error in loading ips");
      e.printStackTrace();
    }
  }

  public static boolean isValidIP(String ip) {
    log.info("client ip {}", ip);
    if (ips.contains(ip)) {
      return true;
    }
    return false;
  }
}
