import React, { useEffect } from 'react'
import { connect } from 'react-redux';
import { getJobs } from '../../actions/jobActions';
import { getJobsByIdArray } from '../../actions/jobActions';
import JobQueueItem from './JobQueueItem';

// the list of the jobs in the user's jobQueue (shown in operator view, right)

export const JobQueue = ({ job: { jobs, userJobs }, user: { user }, getJobs, getJobsByIdArray }) => {
    useEffect(() => {
        console.log("user is: ");
        console.log(user);
        console.log("User's requested-job IDs:");
        console.log(user.jobQueue);
        getJobsByIdArray(user.jobQueue);
        //getJobs({});
    }, []);

    return (
        userJobs && userJobs.map((job) => <JobQueueItem job={job} key={job._id} />)
    )
}

const mapStateToProps = (state) => ({
  job: state.job,
  user: state.user
})

export default connect(mapStateToProps, { getJobs, getJobsByIdArray })(JobQueue);