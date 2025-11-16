import { configureStore } from "@reduxjs/toolkit"
import authReducer from "./slices/authSlice"
import guildsReducer from "./slices/guildsSlice"
import channelsReducer from "./slices/channelsSlice"
import messagesReducer from "./slices/messagesSlice"
import presenceReducer from "./slices/presenceSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    guilds: guildsReducer,
    channels: channelsReducer,
    messages: messagesReducer,
    presence: presenceReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch


