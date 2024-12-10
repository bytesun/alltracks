// @ts-nocheck

import { Actor, ActorSubclass, HttpAgent } from "@dfinity/agent"
import { Principal } from "@dfinity/principal"

import ICEventService from "../api/icevent/service.did";
import AlltracksService from "../api/alltracks/service.did";

import { defaultAgent } from "../lib/canisters"

import * as ICEvent from "../api/icevent/index";
import * as Alltracks from "../api/alltracks/index";

import React, { createContext, useContext, useReducer } from "react"
import { ROLE_VIEWER } from "../lib/constants"


export type State = {
  agent: HttpAgent
  icevent: ActorSubclass<ICEventService._SERVICE>  
  alltracks: ActorSubclass<AlltracksService._SERVICE>

  isAuthed: boolean
  principal: Principal | null
  showLoginModal: boolean
  loading: boolean
  wallet: any | null;  
}

const createActors = (agent: HttpAgent = defaultAgent) => ({
  icevent: ICEvent.createActor(agent, { actorOptions: {} }),
  alltracks: Alltracks.createActor(agent, { actorOptions: {} }),
})

const initialState: State = {
  ...createActors(),
  
  agent: defaultAgent,
  isAuthed: false,
  principal: null,
  showLoginModal: false,
  
  loading: false,
  wallet: null
}

type Action =
  | {
      type: "SET_AGENT"
      agent: HttpAgent | null
      isAuthed?: boolean
    }
  | {
      type: "SET_PRINCIPAL"
      principal: Principal
    }
  
  | {
      type: "SET_LOGIN_MODAL"
      open: boolean
    }
 
  | {
      type: "SET_LOADING"
      loading: boolean
    }
  | { type: "SET_WALLET"; wallet: any }
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SET_AGENT":
      const agent = action.agent || defaultAgent
      return {
        ...state,
        ...createActors(agent),
        agent,
        isAuthed: !!action.isAuthed,
      }
    
    case "SET_PRINCIPAL":
      return {
        ...state,
        principal: action.principal,
      }
    case "SET_LOGIN_MODAL":
      return {
        ...state,
        showLoginModal: action.open,
      }
   
    case "SET_LOADING":
      return {
        ...state,
        loading: action.loading,
      }
    case "SET_WALLET":
      return {
        ...state,
        wallet: action.wallet,
      }
    default:
      return { ...state }
  }
}

const Context = createContext({
  state: initialState,
  dispatch: (_: Action) => null,
})

const Store = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <Context.Provider value={{ state, dispatch }}>{children}</Context.Provider>
  )
}

export const useGlobalContext = () => {
  const context = useContext(Context)
  if (context === undefined) {
    console.log("context is undefined")
    throw new Error("useGlobalContext must be used within a CountProvider")
  }
  return context
}

export const useSetLoginModal = () => {
  const context = useGlobalContext()
  return [
    context.state.showLoginModal,
    (open: boolean) => context.dispatch({ type: "SET_LOGIN_MODAL", open }),
  ] as const
}

// export const useNotifications = () => {
//   const context = useGlobalContext();
//   return {
//     list: context.state.notifications,
//     remove: (id: string) => context.dispatch({ type: "REMOVE_NOTIFICATION", id }),
//     clear: () => context.dispatch({ type: "REMOVE_ALL_NOTIFICATION" }),
//   };
// };

export const useICEvent = () => {
  const context = useGlobalContext()
  return context.state.icevent
}

export const useAlltracks = () => {
  const context = useGlobalContext()
  return context.state.alltracks
}

// export const useFidenza = () => {
//   const context = useGlobalContext();
//   return context.state.fidenza;
// }

export const useSetAgent = () => {
  const { dispatch } = useGlobalContext()

  return async ({
    agent,
    isAuthed,
  }: {
    agent: HttpAgent
    isAuthed?: boolean
  }) => {
    dispatch({ type: "SET_AGENT", agent, isAuthed })

    if (isAuthed) {
      const principal = await agent.getPrincipal()
      console.log("authed", principal.toText())

      dispatch({
        type: "SET_PRINCIPAL",
        principal,
      })
    } else {
      dispatch({ type: "SET_PRINCIPAL", principal: null })
      console.log("not authed")
    }
  }
}
export const useSetWallet = () => {
  const { dispatch } = useGlobalContext();
  return (wallet: any) => dispatch({ type: "SET_WALLET", wallet });
};

export const useLoading = () => {
  const { dispatch, state } = useGlobalContext()
  return {
    loading: state.loading,
    setLoading: (loading: boolean) => {
      dispatch({
        type: "SET_LOADING",
        loading,
      })
    },
  }
}
export default Store
