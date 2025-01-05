FROM nvidia/cuda:12.3.2-runtime-ubuntu22.04

RUN apt update -q && apt install -y python3 python3-pip python3-venv
WORKDIR /app

RUN python3 -m venv .venv
RUN .venv/bin/python3 -m pip install --pre -U -f https://mlc.ai/wheels mlc-llm-nightly-cu123 mlc-ai-nightly-cu123

ENTRYPOINT [ "mlc_llm" ]