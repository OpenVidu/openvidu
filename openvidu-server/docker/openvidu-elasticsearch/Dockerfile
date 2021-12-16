ARG ELASTICSEARCH_VERSION
FROM docker.elastic.co/elasticsearch/elasticsearch:${ELASTICSEARCH_VERSION}

# Remove class which causes the CVE-2021-44228 and CVE-2021-45046 and disable log4j Message lookup
# Elasticsearch mention that versions using jdk9+ they use a property which makes elasticsearch not susceptible of
# RCE or DNS lookup. This is just to be 100% sure that the library can not potentialy in the future be triggered.
# Those mitigation are the recommended ones:
# - https://xeraa.net/blog/2021_mitigate-log4j2-log4shell-elasticsearch/
# - https://discuss.elastic.co/t/apache-log4j2-remote-code-execution-rce-vulnerability-cve-2021-44228-esa-2021-31/291476
ENV LOG4J_FORMAT_MSG_NO_LOOKUPS=true
RUN for jar_file in $(find / -name '*.jar' -exec grep -Hls JndiLookup.class {} \;); do \
        zip -q -d "${jar_file}" org/apache/logging/log4j/core/lookup/JndiLookup.class; \
    done


