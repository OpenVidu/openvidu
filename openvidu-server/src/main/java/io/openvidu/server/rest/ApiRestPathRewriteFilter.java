package io.openvidu.server.rest;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;
import javax.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.util.WebUtils;

public class ApiRestPathRewriteFilter implements Filter {

	protected static final Logger log = LoggerFactory.getLogger(ApiRestPathRewriteFilter.class);

	protected Map<String, String> PATH_REDIRECTIONS_MAP = new HashMap<String, String>() {
		{
			// APIs
			put("/api/", RequestMappings.API + "/");
			put("/config", RequestMappings.API + "/config");
			put("/config/", RequestMappings.API + "/config/");
			put("/cdr", RequestMappings.CDR);
			// Static resources
			put("/cdr/", RequestMappings.CDR + "/");
			put("/recordings/", RequestMappings.RECORDINGS + "/");
			put("/layouts/custom/", RequestMappings.CUSTOM_LAYOUTS + "/");

			put("/accept-certificate", RequestMappings.ACCEPT_CERTIFICATE); // ??
		}
	};
	protected String[] PATH_REDIRECTIONS_ARRAY;

	public ApiRestPathRewriteFilter() {
		PATH_REDIRECTIONS_ARRAY = PATH_REDIRECTIONS_MAP.keySet().toArray(new String[PATH_REDIRECTIONS_MAP.size()]);
	}

	@Override
	public void init(FilterConfig filterConfig) throws ServletException {
		log.info("Initializing API REST path rewrite filter");
	}

	@Override
	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
			throws IOException, ServletException {

		HttpServletRequest req = (HttpServletRequest) request;
		HttpServletResponse res = (HttpServletResponse) response;
		String requestPath = req.getRequestURI();

		String oldBasePath = null;
		String newBasePath = null;

		for (final String path : PATH_REDIRECTIONS_ARRAY) {
			if (requestPath.startsWith(path)) {
				oldBasePath = path;
				break;
			}
		}

		if (oldBasePath != null) {

			newBasePath = PATH_REDIRECTIONS_MAP.get(oldBasePath);

			String redirectURI = newBasePath + requestPath.substring(oldBasePath.length());
			StringBuffer redirectURL = new StringBuffer(
					((HttpServletRequest) request).getRequestURL().toString().replaceFirst(oldBasePath, newBasePath));

			String logPathEnding = oldBasePath.endsWith("/") ? "**" : "/**";
			log.warn(
					"Path {} is deprecated. Use path {} instead. Deprecated path will be removed in a major release in the future",
					oldBasePath + logPathEnding, newBasePath + logPathEnding);

			chain.doFilter(new HttpServletRequestWrapper((HttpServletRequest) request) {
				@Override
				public String getRequestURI() {
					return redirectURI;
				}

				@Override
				public StringBuffer getRequestURL() {
					return redirectURL;
				}

				@Override
				public Object getAttribute(String name) {
					if (WebUtils.INCLUDE_SERVLET_PATH_ATTRIBUTE.equals(name))
						return redirectURI;
					return super.getAttribute(name);
				}
			}, response);

		} else {
			chain.doFilter(req, res);
		}
	}

	@Override
	public void destroy() {
		// Nothing to free up...
	}

}
