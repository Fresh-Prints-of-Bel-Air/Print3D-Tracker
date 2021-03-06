import axios from 'axios';
import { keyDown } from 'materialize-css';
import {
  GET_BUILDS,
  GET_USER_BUILD_LIST,
  ADD_BUILD,
  DELETE_BUILD,
  UPDATE_BUILD,
  BUILDS_ERROR,
  UPDATE_JOBS,
  UPDATE_USER,
  SET_LOADING,
  // FAILED_SUBMISSION,
  JOBS_ERROR,
  AUTH_ERROR,
  GET_USER_JOB_QUEUE,
  REMOVE_DELETED_BUILD_FROM_JOBS
} from './types';

//Get builds from server that match filter (if any) and save to local state
//"filter" param will be a json object with filters
export const getBuilds = (filter) => async (dispatch) => {
  setLoading();
  
  try {
    const res = await axios.get('/api/builds/', { params: filter }); // "params" really means the QUERY PARAMS
    dispatch({
      type: GET_BUILDS, 
      payload: res.data});
  }
  catch (err) {
    dispatch({
      type: BUILDS_ERROR, 
      payload: err
    });
  }
}

// get multiple builds according to an array of IDs as input
// currently only used for getting the user's builds. Potentially add a second parameter to specify reducer action.
export const getBuildsByIdArray = (buildIdArray) => async (dispatch) => {
  setLoading();
  try {
    const res = await axios.get('/api/builds/multipleBuildsById', { params: { buildIdArray } });
  
    dispatch({
        type: GET_USER_BUILD_LIST,
        payload: res.data,
    });

  } catch (err) {
      dispatch({
          type: BUILDS_ERROR,
          payload: err.response.statusText,
      });
      console.error('getBuildsByIdArray error.');
  }
}




//Add a build, and save to local state
//AssociatedJobs is an array of [ job ]. The jobs each have updated quantities, and need to have the new build ID added.
export const addBuild = (build, associatedJobs, user) => async (dispatch) => {
  try {
    const config = {
      headers: {
        'Content-Type' : 'application/json',
      }
    }
    setLoading();

    const projectSet = new Set();
    associatedJobs.forEach((job) => projectSet.add(job.projectName));
    const projectArray = Array.from(projectSet);
    const buildRes = await axios.post('/api/builds', {...build, projects: [...projectArray]} , config);
  
    dispatch({
      type: ADD_BUILD,
      payload: buildRes.data,
    });

    try { //update the user with the newly created build
          // including adding the build to the user's build list
      const updateUserRes = await axios.put(
        `/api/users/${user._id}`, 
        { ...user, buildList: [...user.buildList, buildRes.data._id] }, 
        config
      );

      dispatch({type: UPDATE_USER, payload: updateUserRes.data});

      try {
        //update each associated job to include the ID of the newly added Build
        associatedJobs.forEach(async (job) => {
          let updatedJob = {...job, builds: [...job.builds, buildRes.data._id]};
          const jobUpdateRes = await axios.put(`/api/jobs/${job._id}`, updatedJob, config);
        });
        
        //"Get" the updated jobs from the database to update jobs in Redux
        try {
          setLoading();
          let jobIdArray = associatedJobs.map((job) => job._id);
          const jobRes = await axios.get('/api/jobs/multipleJobsById', { params: { jobIdArray: [...jobIdArray] } });

          dispatch({
              type: UPDATE_JOBS,
              payload: jobRes.data,
          });

          try { //also update the userJobQueue
            setLoading();
            
            const userJobRes = await axios.get('/api/jobs/multipleJobsById', { params: { jobIdArray: [...user.jobQueue] } });
            dispatch({
              type: GET_USER_JOB_QUEUE,
              payload: userJobRes.data,
            });
          } catch (err) {
            dispatch({
              type: JOBS_ERROR,
              payload: err.response.statusText,
          });
            console.error('getJobsByIdArray error for userJobQueue.');
          }

        } catch (err) {
            dispatch({
                type: JOBS_ERROR,
                payload: err.response.statusText,
            });
            console.error('getJobsByIdArray error.');
        }
      } catch (err) {
        dispatch({
          type: JOBS_ERROR,
          payload: err.response.data.msg
        });
      }
    } catch (err) {
      dispatch({type: AUTH_ERROR});
    }
  } catch (err) {
    alert(err.response.data);
    dispatch({
      type: BUILDS_ERROR,
      payload: err.response.data
    });
  }
}

// export const handleFailedSubmission = (buildSubmission) => async (dispatch) => {
//   dispatch({
//     type: FAILED_SUBMISSION,
//     payload: buildSubmission,
//   });
// }

//Delete a build
// 1.) Delete the Build
// 2.) Delete the Build from the user's buildlist
// 3.) Delete the Build from each associated job 
//Filter out the deleted build from jobs, userJobQueue, userRequestedJobs

export const deleteBuild = (id, user) => async (dispatch) => {
  const config = {
    headers: {
      'Content-Type': 'application/json',
    }
  }
  setLoading();
  
  try {
    const deletedBuild = await axios.delete(`/api/builds/${id}`); //delete the build
    dispatch({type: DELETE_BUILD, payload: id});
    
      try { //delete the build from each associated job, decrementing parts building for each
            //Steps: get jobs by ID array, filter out build from each, decrement parts building based on the build deleted for each
        let IDs = deletedBuild.data.associatedJobs.map((job) => job._id);
        let jobsToUpdate =  new Map(); //to hold jobs that need to be updated with new part quantities based on the deleted build. (Key = Job Number, Value = Job)
      
        for(const ID of IDs){
          let jobRes = await axios.get(`/api/jobs/${ID}`);

          //remove the deleted build's ID from each associated job
          jobRes.data.builds = jobRes.data.builds.filter((buildID) => buildID !== id);
          jobsToUpdate.set(jobRes.data.job_number, jobRes.data);
        };
      
        //update each job's part quantities
        //Format of requestedPart:
        // {
        //  name: String,
        //  quantity: Number,
        //  building: Number,
        //  remaining: Number,
        //  extras: Number,
        // }

        //Format of partBuilding:
        // {
        //   name: String,
        //   quantity: Number,
        //   jobNumber: String
        // }


        //!!!!NOTE!!! USE FOR...OF LOOPS INSTEAD OF FOREACH FOR ASYNCHRONOUS SEQUENTIAL OPERATIONS
        deletedBuild.data.partsBuilding.forEach((partBuilding) => { //for each part in the deleted build, decrement the parts building (and extra parts if necessary) for the associated job
          let associatedJob = jobsToUpdate.get(parseInt(partBuilding.jobNumber)); //get the associated job reference from the job map

          associatedJob.requestedParts.forEach((requestedPart) => {
            if(requestedPart.name === partBuilding.name){
              requestedPart.building -= partBuilding.quantity; //first decrement the amount building by the quantity specified in the deleted build
              
              let quantityToDelete = partBuilding.quantity; //decrement extras and then increment remaining using this number
              
              //decrement extras to a minimum of 0
              if(requestedPart.extras - quantityToDelete >= 0){ //we have more extras than we need to delete (simply decrement extras)
                requestedPart.extras -= quantityToDelete;
                quantityToDelete = 0;
              }
              else { //we have fewer extras than we need to delete (the rest will be added to Remaining)
                quantityToDelete -= requestedPart.extras;
                requestedPart.extras = 0;
              }
              
              //if there are remaining parts to delete, increment the amount remaining up to the requested quantity at most
              requestedPart.remaining += quantityToDelete;
            }   
          });
        }); //all jobs associated with the deleted build should now be properly updated

        try { 
          //PUT the updated jobs to the database
          for(const job of jobsToUpdate.values()){
            await axios.put(`/api/jobs/${job._id}`, job, config);
          }
          dispatch({
            type: UPDATE_JOBS,
            payload: Array.from(jobsToUpdate.values()),
          });
        } catch(err){
          console.error(err);
        }
      } catch (err) {
        console.error(err);
      }
  } catch (err) {
    console.error(err);
  }
}

//Update a build
export const updateBuild = (build) => async (dispatch) => {
  const config = {
    headers: {
      'Content-Type' : 'application/json',
    }
  }
  setLoading();
  try {
    const res = await axios.put(`/api/builds/${build._id}`, build, config);
    
    dispatch({
      type: UPDATE_BUILD,
      payload: res.data,
    });
  } catch (err) {
    dispatch({
      type: BUILDS_ERROR,
      payload: err.response.data.msg
    });
  }
}

export const setLoading = () => async (dispatch) => {
    dispatch({
      type: SET_LOADING,
    });
};
