# Glider Function Automation Control (GFAC)

## Setup

* Clone this repo
* Make sure to copy `(backend/frontend)/env.example` to `.env` and fill them out
  * The default mongodb settings should be already good if you're using docker to run the project
* [local.json](/backend/config/local.json.example) needs to be copied as `local.json` and filled out in backend/config/ dir. This is the connection point to the glider piloting software. When using the dummy API you can fill anything out in `clientId` & `secret`

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

### Other useful notes

* Backend
  * All the tasks that run on a schedule that interface with the glider get called on `const backend_schedule` in [app.mjs](/backend/app.mjs). You can change how often it runs by changing the number at the front. `const backend_schedule = scheduleJob('*/45 * * * * *', async () => {
` the 45 means it runs every 45 seconds.
  * To create a glider, send a post request to the backend at /glider with the JSON body `{"name": "fundy"}` as an example
  * Events are actions that happen that trigger an update with the glider, for example a glider moving out of a geofence will trigger an event to update some glider related config.
* Frontend
* Database
  * mongodb is the database, mongo-express is included in the docker-compose as an easy way of interacting with the database, you can access it at `localhost:8081` with the default config