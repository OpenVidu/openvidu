package org.openvidu.server.security;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

@Controller
public class CertificateController {
	
	@RequestMapping(value = "/accept-certificate", method = RequestMethod.GET)
	public String acceptCert(Model model) throws Exception {
		System.out.println("Navigating to accept certificate");
		return "accept-cert";
	}
	
}
