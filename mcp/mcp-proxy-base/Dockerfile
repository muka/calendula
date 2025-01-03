FROM node:22

ENV PORT=80
ENV ENDPOINT=/sse
ENV COMMAND="exit 1"

RUN apt update -q && apt install -y python3 git curl wget

RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH=$PATH:/root/.local/bin

ADD ./entrypoint.sh /
RUN chmod +x /entrypoint.sh

WORKDIR /app

ENTRYPOINT [ "/entrypoint.sh" ]