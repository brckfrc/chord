import { configureStore } from "@reduxjs/toolkit"
import authReducer from "./slices/authSlice"
import guildsReducer from "./slices/guildsSlice"
import channelsReducer from "./slices/channelsSlice"
import messagesReducer from "./slices/messagesSlice"
import presenceReducer from "./slices/presenceSlice"
import friendsReducer from "./slices/friendsSlice"
import dmsReducer from "./slices/dmsSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    guilds: guildsReducer,
    channels: channelsReducer,
    messages: messagesReducer,
    presence: presenceReducer,
    friends: friendsReducer,
    dms: dmsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch


