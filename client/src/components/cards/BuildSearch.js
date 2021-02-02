import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import {getBuilds} from '../../actions/buildActions';
import M from 'materialize-css';
import { set } from 'mongoose';


const BuildSearch= ({build: {builds}, getBuilds}) => {
  useEffect(() => {
    M.AutoInit();
    console.log("UseEffect called");
    //pull builds from API with current filter values
  },[]);



  //const statusText = useRef('');

  const [userFormData, setUserFormData] = useState({
    status: null,
    startedFrom: null,
    startedTo: null,
    deliveredFrom: null,
    deliveredTo: null,
    operator: null,
    project: null,
  });
  const { status, startedFrom, startedTo, deliveredFrom, deliveredTo, project, operator } = userFormData;

  const onSubmit = (e) => {
    e.preventDefault();
    //console.log("onSubmit called");
    //console.log(userFormData);
    getBuilds(userFormData);
  }
  const onChange = (e) => {
    setUserFormData({
      ...userFormData,
      [e.target.name]: e.target.value,
    });
    console.log(e.target.value);
  };

  // copies the contents of the builds state into a table on the clipboard
  // separated by tabs and newlines
  const copyHistory = () => {
    let billingSheet = "";
    // each row will have the format
    // buildFileName  dateStarted material  projects
    builds.forEach((build) => {
      billingSheet += build.buildFileName 
        + '\t' + build.dateStarted.split('T')[0]
        + '\t' + build.material
        + '\t' + build.projects + '\n';
    });
    navigator.clipboard.writeText(billingSheet);
  }
  const clearSearch = () => {
    setUserFormData({
      ...userFormData,
      status: null,
      startedFrom: null,
      startedTo: null,
      deliveredFrom: null,
      deliveredTo: null,
      operator: null,
      project: null,
    });
    console.log(userFormData);
  }

  return (
    <div>
      <div style={{width: '100%', height: '150px' }}>
        <div
          className='grey lighten-2'
          style={{ position: 'fixed', width: '100%', height: '150px', zIndex: '1' }} //keeps filter options displayed on page
        >
          <div className='row'>
            <div className='col s2'>
              <label htmlFor='status' style={{"font-weight": "bold", "color" : "black" }}>Status:</label>
              <select name='status' onChange={onChange}>
                <option value='' disabled selected>
                  Select
                </option>
                <option value='Build File Ready'>Build File Ready</option>
                <option value='Build Started'>Build Started</option>
                <option value='Build Complete'>Build Complete</option>
                <option value='Build Post-Processed'>Build Post-Processed</option>
                <option value='Build Delivered'>Build Delivered</option>
              </select>
            </div>
            <div className='col s2'>
              <label htmlFor='startedFrom' style={{"font-weight": "bold", "color" : "black" }}>Builds Started From: </label>
              <input
                name='startedFrom'
                id='startedFrom'
                type='date'
                onChange={onChange}
              />
            </div>
            <div className='col s2'>
              <label htmlFor='startedTo' style={{"font-weight": "bold", "color" : "black" }}>...To:</label>
              <input name='startedTo' id='startedTo' type='date' onChange={onChange} />
            </div>
            <div className='col s2'>
            <label htmlFor='deliveredFrom' style={{"font-weight": "bold", "color" : "black" }}>Builds Delivered From: </label>
              <input
                name='deliveredFrom'
                id='deliveredFrom'
                type='date'
                onChange={onChange}
              />
            </div>
            <div className='col s2'>
              <label htmlFor='deliveredTo' style={{"font-weight": "bold", "color" : "black" }}>...To:</label>
              <input name='deliveredTo' id='deliveredTo' type='date' onChange={onChange} />
            </div>
            <div className='col s1'>
                <label htmlFor='operatorName' style={{"font-weight": "bold", "color" : "black" }}>Operator Name:</label>
                <input name='operator' placeholder="First/Last" type="text" id="operatorName" onChange={onChange}/>
            </div>
            <div className='col s1'>
                <label name='project' htmlFor='projectName' style={{"font-weight": "bold", "color" : "black" }} onChange={onChange}>Project Name:</label>
                <input placeholder="" type="text" id="projectName" />
            </div>
            <button style={{'margin': '20px'}} className="btn waves-effect waves-light blue" type="submit" name="submit" onClick={onSubmit}>Submit
                <i className="material-icons right">send</i>
            </button>
            <button style={{'margin': '20px'}} className="btn waves-effect waves-light blue" type="submit" name="submit" onClick={copyHistory}>Copy
                <i className="material-icons right">content_copy</i>
            </button>
            <button style={{'margin': '20px'}} className="btn waves-effect waves-light blue" type="reset" name="clear" onClick={clearSearch}>Clear
                <i className="material-icons right">clear</i>
            </button>
          </div>
          
        </div>
      </div>
    </div>
    
  );
};

const mapStateToProps = (state) => ({
  build: state.build
});

export default connect(mapStateToProps, {getBuilds})(BuildSearch);
