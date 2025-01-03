FROM node:22

WORKDIR /app
ADD ./package.json ./
RUN npm i
ADD . ./

ENTRYPOINT [ "npm" ]
CMD [ "start" ]