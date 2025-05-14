import { Schema } from 'mongoose'

const userSchema = new Schema({
  id: Number,
  firstName: String,
  lastName: String,
  username: String,
  photoUrl: String,
  authDate: Number,
  hash: String,
  timestamp: Number,
  meta: {
    type: Map,
    of: Schema.Types.Mixed
  }
})

export default userSchema
