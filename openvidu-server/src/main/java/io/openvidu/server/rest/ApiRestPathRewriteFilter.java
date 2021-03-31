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
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.ExpressionUrlAuthorizationConfigurer;
import org.springframework.web.util.WebUtils;

import io.openvidu.server.config.OpenviduConfig;

public class ApiRestPathRewriteFilter implements Filter {

	protected static final Logger log = LoggerFactory.getLogger(ApiRestPathRewriteFilter.class);

	protected Map<String, String> PATH_REDIRECTIONS_MAP = new HashMap<String, String>() {
		{
			// WS
			put("/info", RequestMappings.WS_INFO);
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
		log.warn("Support for deprecated REST API paths enabled. Update your REST API clients to use the new paths");
		log.warn(
				"Deprecated path support will be removed in a future release. You can disable old path support to test compatibility with property SUPPORT_DEPRECATED_API=false");
	}

	@Override
	public void destroy() {
		// Nothing to free up...
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
			log.warn("Path {} is deprecated. Use path {} instead. Deprecated path will be removed in a future release",
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

	public static void protectOldPathsCe(
			ExpressionUrlAuthorizationConfigurer<HttpSecurity>.ExpressionInterceptUrlRegistry conf,
			OpenviduConfig openviduConf) throws Exception {

		conf.antMatchers("/api/**").hasRole("ADMIN")
				// /config
				.antMatchers(HttpMethod.GET, "/config/openvidu-publicurl").permitAll()
				.antMatchers(HttpMethod.GET, "/config/**").hasRole("ADMIN")
				// /cdr
				.antMatchers(HttpMethod.GET, "/cdr/**").hasRole("ADMIN")
				// /accept-certificate
				.antMatchers(HttpMethod.GET, "/accept-certificate").permitAll()
				// Dashboard
				.antMatchers(HttpMethod.GET, "/dashboard/**").hasRole("ADMIN");

		// Security for recording layouts
		conf.antMatchers("/layouts/**").hasRole("ADMIN");

		// Security for recorded video files
		if (openviduConf.getOpenViduRecordingPublicAccess()) {
			conf = conf.antMatchers("/recordings/**").permitAll();
		} else {
			conf = conf.antMatchers("/recordings/**").hasRole("ADMIN");
		}
	}

}
