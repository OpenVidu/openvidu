package io.openvidu.server.rest;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

@Controller
public class CertificateRestController {
	
	@RequestMapping(value = "/accept-certificate", method = RequestMethod.GET)
	public String acceptCert() throws Exception {
		System.out.println("Navigating to accept certificate");
		return "accept-cert";
	}
	
}