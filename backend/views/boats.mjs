import { ObjectId } from "mongodb";
import db from '../db/conn.mjs'
import {
  predict_boat_movement_range,
  serialize_boats,
} from "../utils/boat_utils.mjs";

const get_boats = async (req, res) => {
  // try {
  //   await update_boats();
  // } catch (error) {
  //   console.error("Could not refresh boats before serializing:", error);
  // }

  const boats = await serialize_boats(parseInt(req.params.end_offset));
  return res.send(boats).status(200);
};


//NOT USED BY FRONTEND ATM
//GET params - start_offset, end_offset, interval_minutes
const get_boat_predict = async (req, res) => {
  const id = ObjectId.createFromHexString(req.params.id);
  // const date = new Date(Number.parseInt(req.params.datetime));
  const {start_offset, end_offset, interval} = req.params
  const pred_move = await predict_boat_movement_range(
    id,
    parseInt(start_offset),
    parseInt(end_offset),
    parseInt(interval)
  );
  return res.send(pred_move).status(200);
};

export { get_boats, get_boat_predict, check_gliders_safe };
