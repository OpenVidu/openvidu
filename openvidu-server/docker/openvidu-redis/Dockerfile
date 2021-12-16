FROM redis:6.2.6-alpine

COPY ./entrypoint.sh /usr/local/bin

RUN chmod +x /usr/local/bin/entrypoint.sh

CMD /usr/local/bin/entrypoint.sh
