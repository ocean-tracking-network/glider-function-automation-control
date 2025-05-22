var log = {
  text: String,
  date: Date,
}

var file = {
  name: String,
  path: String,
}

var event = {
  file: Number,
  geofence: Number,
  type: String, // enter/exit
}

var geofence = {
  latlngs: Array[Array[(Number, Number)]],
  name: String,
}

var config = {
  enable: Boolean,
  glidername: String,
}
