FROM perl:5.40-slim

WORKDIR /opt/riichi-atelier

# Install runtime/test dependencies before copying frequently changing assets.
COPY Makefile.PL .
RUN cpanm --installdeps --notest .

COPY . .
RUN prove -l t \
    && useradd --system --uid 10001 --create-home atelier \
    && chown -R atelier:atelier /opt/riichi-atelier

ENV PORT=8080 MOJO_MODE=production
USER atelier
EXPOSE 8080
STOPSIGNAL SIGQUIT
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["perl", "-MMojo::UserAgent", "-e", "exit(Mojo::UserAgent->new->request_timeout(3)->get('http://127.0.0.1:'.($ENV{PORT} || 8080).'/health')->result->is_success ? 0 : 1)"]

CMD ["hypnotoad", "-f", "app.pl"]
