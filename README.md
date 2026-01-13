# Glider Function Automation Control (GFAC)

## Setup

#### Requirements
* NodeJS/npm
* Mongodb

#### Project Setup

* Clone this repo
* In both the backend and frontend folder run `npm install`

- Make sure to copy `(backend/frontend)/env.example` to `.env` and fill them out

#### Running

* Frontend
  * In the frontend/ directory, run `npm run dev`
* Backend
  * In the backend/ directory , run `node app.mjs`


## Development

### Versioning

Change the number in [HeaderComponent.vue](./frontend/src/components/HeaderComponent.vue)

- Main

  - `major.minor.patch`
  - A patch would be anytime a purly bug fix push gets pushed to main

- Development
  - `major.minor.day-of-month:branch`
  - Keep major/minor version of the branched off version, incrament one up from main's minor or major before a merge request
