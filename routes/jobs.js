const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator/check');
const Job = require("../models/Job");
const auth = require('../middleware/auth');

// find many (array of IDs)
// that don't have status: 'Complete'
router.get(
    '/multipleJobsById',
    auth,
    async (req, res) => {
        try {
            const jobs = await Job.find({ status: { $ne: 'Complete' }}).where('_id').in(req.query.jobIdArray).exec();
            res.json(jobs);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('server error');
        }
    }
);

// get by ID
router.get(
  '/:id', 
  auth,
  async (req, res) => {
      try {
          const job = await Job.findById(req.params.id);
          res.json(job);
      } catch (err) {
          console.error(err.message);
          res.status(500).send('server error');
      }
  }
);

//@route GET api/jobs
//@desc Get a job
//@access Public
// get by filter
router.get(
  '/',
  auth, 
  async (req, res) => {
      const filter = {
          status: { $ne: 'Cancelled' } // not equals
      }
    
    const { job_number, requester, projectName, dateRequestedLowerBound, dateRequestedUpperBound, jobStatus, filterType } = req.query;

    if (dateRequestedLowerBound && dateRequestedUpperBound) {
        filter.$and = [
            { dateRequested: { $gte: dateRequestedLowerBound } }, 
            { dateRequested: { $lte: dateRequestedUpperBound } }
        ]
    } else if (dateRequestedLowerBound) {
        filter.dateRequested = {
            $gte: dateRequestedLowerBound
        }
    } else if (dateRequestedUpperBound) {
        filter.dateRequested = {
            $lte: dateRequestedUpperBound
        }
    }
    
    // special filter for JobList
    if(filterType === "jobList") {
       filter.status = { $nin: ["Cancelled", "Complete"] };
    } else {
        if(job_number) filter.job_number = { $gte: job_number };
        if(jobStatus) filter.status = { $eq: jobStatus };
        if(requester) filter.requester = { $eq: requester };
        if(projectName) filter.projectName = { $eq: projectName };
    }
    
    try {
        const jobs = await Job.find(filter);
        res.json(jobs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('server error');
    }
  }
);

//@route POST api/jobs
//@desc Add a Job
//@access Public
router.post(
  '/',
  [
      auth,
      check(
          'requester', 
          'invalid job post format: requester'
      ).notEmpty().isString(),
      check(
          'projectName', 
          'Please enter a project name.'
      ).notEmpty().isString(),
      check(
          'folderLocation', 
          'Please enter a folder location.'
      ).notEmpty().isString(),
      check(
          'deliverTo', 
          'Please enter to whom these parts are to be delivered.'
      ).notEmpty().isString(),
      check(
          'requestedParts', 
          'invalid job post format: requester'
      ).notEmpty(),
  ],
  async (req, res) => {
      const errors = validationResult(req);
          if (!errors.isEmpty()) {
              // handle errors
              return res.status(400).send(errors.array()[0].msg);
          }
      let arePartQuantitiesValid = true;
      req.body.requestedParts.forEach((requestedPart) => {
          if (requestedPart.quantity === '' || parseInt(requestedPart.quantity) <= 0){
              arePartQuantitiesValid = false;
          }   
      })

    if (!arePartQuantitiesValid) {
        return res.status(400).send('Please enter a quantity greater than zero for each of the requested parts');
    }

    try {
        const newJob = new Job({
            ...req.body,
            lastUpdated: Date.now()
        });

        const job = await newJob.save();
        res.json(job);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
  }
);

//@route PUT api/jobs/updateMany
//@desc Update multiple jobs. Expected to be supplied with the filter (ids of documents to update) and the update to apply

//format of action containing filter and update: 
// {
//   filter: { _id: { $in: associatedJobs } },
//   updateToApply: { $push: { builds: buildRes._id } }
// }

//@access Public
router.put(
    '/updateMany',
    auth,
    async (req, res) => {
        try {
            let updatedJobs = await Job.updateMany(req.body.filter, req.body.updateToApply);
            res.json(updatedJobs);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
);

//@route PUT api/jobs
//@desc Update a job. Frontend prefills fields with existing values. User may update certain values (not empty).
//@access Public
router.put(
    '/:id', 
    auth,
    async (req, res) => {
        const { projectName, dateRequested, dateNeeded, completionDate, folderLocation, 
          material, resolution, priority, deliverTo, status, lastUpdated, notes, acceptingOperators, 
          requestedParts, builds } = req.body;
        
        const updateFields = {};
        updateFields.lastUpdated = Date.now();
        if(projectName) updateFields.projectName = projectName;
        if(dateRequested) updateFields.dateRequested = dateRequested;
        if(dateNeeded) updateFields.dateNeeded = dateNeeded;
        if(completionDate) updateFields.completionDate = completionDate;
        if(folderLocation) updateFields.folderLocation = folderLocation;
        if(material) updateFields.material = material;
        if(resolution) updateFields.resolution = resolution;
        if(priority) updateFields.priority = priority;
        if(deliverTo) updateFields.deliverTo = deliverTo;
        if(status) updateFields.status = status;
        if(lastUpdated) updateFields.lastUpdated = lastUpdated;
        if(notes) updateFields.notes = notes;
        if(requestedParts) updateFields.requestedParts = requestedParts;
        if(acceptingOperators) updateFields.acceptingOperators = acceptingOperators;
        if(builds) updateFields.builds = builds;
        
        try {
            let job = await Job.findByIdAndUpdate(
                req.params.id, 
                { $set: updateFields },
                { new: true }
            );
          res.json(job);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
);

//@route PUT api/jobs
//@desc Delete a job. Only the job requester can delete the job.
//@access Public
router.delete('/:id',
    auth,
    async (req, res) => {
        try {
            let job = await Job.findById(req.params.id);
            if(!job) return res.status(404).json({msg: 'Job not found'});
            let authorized = (job.requesterId == req.user.id) ? true : false;

            if(authorized === false)
                return res.status(401).json({msg: 'Not authorized'});

            const deletedJob = await Job.findByIdAndDelete(req.params.id);
            res.json(deletedJob);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }
);

module.exports = router;