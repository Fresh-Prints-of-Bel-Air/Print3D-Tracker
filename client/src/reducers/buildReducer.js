import {
  ADD_BUILD,
  GET_BUILDS,
  GET_USER_BUILD_LIST,
  DELETE_BUILD,
  SET_LOADING,
  BUILDS_ERROR,
  UPDATE_BUILD,
  CLEAR_ERRORS,
  //FAILED_SUBMISSION,
  RESET_BUILD_STATE
  
 
} from '../actions/types';

const initialState = {
  loading: true,
  builds: [],
  userBuildList: [], // user's buildList
  // lastFailedSubmission: null,
  error: null,
};

export default (state = initialState, action) => {
  switch (action.type) {
    case GET_BUILDS: //also used for search builds
      return {
        ...state,
        builds: action.payload,
        loading: false,
        error: null,
      };
    case GET_USER_BUILD_LIST:
      return {
        ...state,
        userBuildList: action.payload,
        loading: false,
        error: null
      }
    case DELETE_BUILD:
      return {
        ...state,
        builds: state.builds.filter((build) => build._id != action.payload),
        userBuildList: state.userBuildList.filter((build) => build._id != action.payload),
        loading: false,
        error: null,
      }
  
    case UPDATE_BUILD:
      return {
        ...state,
        builds: state.builds.map((build) => build.id === action.payload ? action.payload : build),
        userBuildList: state.userBuildList.map((build) => build._id === action.payload._id ? action.payload : build),
        loading: false,
        error: null,
      }
    // case FAILED_SUBMISSION:
    // return {
    //   ...state,
    //   lastFailedSubmission: action.payload,
    //   loading: false,
    //   error: null,
    // }
    case ADD_BUILD:
      return {
        ...state,
        builds: [...state.builds, action.payload],
        loading: false,
        error: null,
      }
    case RESET_BUILD_STATE:
      return {
        ...state,
        loading: false,
        builds: [],
        userBuildList: [],
        error: null
      }
    case BUILDS_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      }
    case CLEAR_ERRORS:
      return {
        ...state,
        error: null,
      }
    case SET_LOADING:
      return {
        ...state,
        loading: true
      }
    default:
      return state;
  }
};
