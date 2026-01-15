# Glider Function Automation Control (GFAC)

## Setup

* Clone this repo
* Make sure to copy `(backend/frontend)/env.example` to `.env` and fill them out
  * The default mongodb settings should be already good if you're using docker to run the project

### Docker

#### Requirements

* Docker
* Put the `sfmc.tgz` in the [docker/](/docker/) directory

#### Running

* in the docker/ folder run `docker compose up`
* pass in `--build` at the end to force rebuild the container when making changes to the code

### Non Docker

#### Requirements

* NodeJS/npm
* Mongodb
* sfmc javascript library

#### Project Setup

* In both the backend and frontend folder run `npm install`


#### Running

* Frontend
  * In the [frontend/](/frontend/) directory, run `npm run dev`
* Backend
  * In the [backend/](/backend/) directory , run `node app.mjs`


## Development

### Versioning

Change the number in [HeaderComponent.vue](./frontend/src/components/HeaderComponent.vue)

* Main

  * `major.minor.patch`
  * A patch would be anytime a purly bug fix push gets pushed to main

* Development
  * `major.minor.day-of-month:branch`
  * Keep major/minor version of the branched off version, incrament one up from main's minor or major before a merge request
