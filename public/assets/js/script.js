function showLogin() {
    var loginTmpl = $.templates('#loginTmpl');
    var loginOutput = loginTmpl.render({});
    $('body').html(loginOutput);
}

function showSignup() {
    var signupTmpl = $.templates('#signupTmpl');
    var signupOutput = signupTmpl.render({});
    $('body').html(signupOutput);
}

function renderCourses(snapshot) {
    var courseDB = snapshot.child('courses');
    $('#courses-count').html(courseDB.numChildren());
    var courseData = [];
    courseDB.forEach(child => {
        var data = child.val();
        if (data['assignmentsCount'] == 1)
            data['plural'] = '';
        else
            data['plural'] = 's';
        data['courseId'] = child.key;
        courseData.push(data);
    });
    var courseTmpl = $.templates('#courseTmpl');
    var courseOutput = courseTmpl.render(courseData);
    $('#courses').html(courseOutput);
}

function renderAssignments(snapshot) {
    var numUpcomingAssignments = 0;
    var assignDB = snapshot.child('assignments');
    var upAssignData = [];
    var compAssignData = [];
    assignDB.forEach(child => {
        var data = child.val();
        data['assignmentId'] = child.key;
        if (data['milestonesCount'] == 1)
            data['plural'] = '';
        else
            data['plural'] = 's';
        if (!data['isCompleted']) {
            upAssignData.push(data);
            numUpcomingAssignments++;
        } else {
            compAssignData.push(data);
        }
    });
    $('#assignments-count').html(numUpcomingAssignments);
    var upAssignTmpl = $.templates('#upcomingAssignmentTmpl');
    var upAssignOutput = upAssignTmpl.render(upAssignData);
    $('#upcoming-assignments').html(upAssignOutput);
    var compAssignTmpl = $.templates('#completedAssignmentTmpl');
    var compAssignOutput = compAssignTmpl.render(compAssignData);
    $('#completed-assignments').html(compAssignOutput);
}

function renderMilestones(snapshot) {
    var numUpcomingMilestones = 0;
    var mileDB = snapshot.child('milestones');
    var upMileData = [];
    var compMileData = [];
    mileDB.forEach(child => {
        var data = child.val();
        data['milestoneId'] = child.key;
        if (!data['isCompleted']) {
            upMileData.push(data);
            numUpcomingMilestones++;
        } else {
            compMileData.push(data);
        }
    });
    $('#milestones-count').html(numUpcomingMilestones);
    var upMileTmpl = $.templates('#upcomingMilestoneTmpl');
    var upMileOutput = upMileTmpl.render(upMileData);
    $('#upcoming-milestones').html(upMileOutput);
    var compMileTmpl = $.templates('#completedMilestoneTmpl');
    var compMileOutput = compMileTmpl.render(compMileData);
    $('#completed-milestones').html(compMileOutput);
}

function showMain() {
    var user = firebase.auth().currentUser;
    var email, uid;
    if (user != null) {
        email = user.email;
        uid = user.uid;
    }
    var portalTmpl = $.templates('#portalTmpl');
    var portalOutput = portalTmpl.render({username: email});
    $('body').html(portalOutput);
    var db = firebase.database().ref(uid);
    db.on('value', snapshot => {
        renderCourses(snapshot);
        renderAssignments(snapshot);
        renderMilestones(snapshot);
    });
}

function submitCourse() {
    var courseCode = $('#course-code').val();
    var courseName = $('#course-name').val();
    var user = firebase.auth().currentUser;
    var db = firebase.database().ref(user.uid).child('courses');
    var newRef = db.push({
        assignmentsCount: 0,
        courseCode: courseCode,
        courseName: courseName
    });
    $('#course-modal').modal('toggle');
}

function loadCourseOptions() {
    $('#course-select').empty();
    var user = firebase.auth().currentUser;
    var db = firebase.database().ref(user.uid).child('courses');
    db.on('value', snapshot => {
        snapshot.forEach(child => {
            var data = child.val();
            let opt = document.createElement('option');
            opt.value = child.key;
            opt.selected = true;
            opt.innerHTML = data.courseCode + ': ' + data.courseName;
            $('#course-select').prepend(opt);
        });
    });
}

function loadAssignmentOptions() {
    $('#assignment-select').empty();
    var user = firebase.auth().currentUser;
    var db = firebase.database().ref(user.uid).child('assignments');
    db.on('value', snapshot => {
        snapshot.forEach(child => {
            var data = child.val();
            if (!data['isCompleted']) {
                let opt = document.createElement('option');
                opt.value = child.key;
                opt.selected = true;
                opt.innerHTML = data.assignmentName;
                $('#assignment-select').prepend(opt);
            }
        });
    });
}

function submitAssignment() {
    var user = firebase.auth().currentUser;
    var db = firebase.database().ref(user.uid);
    var courseId = $('#course-select').val();
    
    var assignmentName = $('#assignment-name').val();
    var date = $('#assignment-date').val();
    var time = $('#assignment-time').val();
    var courseCode;
    db.child('courses/' + courseId).once('value')
    .then(snapshot => {
        courseCode = snapshot.val().courseCode;
    }).then(() => {
        db.child('assignments').push({
            courseId: courseId,
            courseCode: courseCode,
            assignmentName: assignmentName,
            dueDate: date,
            dueTime: time,
            milestonesCount: 0,
            isCompleted: false
        });
    });
    db.child('courses/' + courseId).once('value')
    .then(snapshot => {
        return snapshot.val().assignmentsCount;
    }).then(currNumAssignments => {
        db.child('courses/' + courseId)
        .update({assignmentsCount: currNumAssignments + 1});
    });
    $('#assignment-modal').modal('toggle');
}

function deleteAssignment(assignmentId, courseId) {
    var user = firebase.auth().currentUser;
    var db = firebase.database().ref(user.uid);
    db.child('assignments/' + assignmentId).remove();
    db.child('courses').child(courseId).once('value')
    .then(snapshot => {
        return snapshot.val().assignmentsCount;
    }).then(currNumAssignments => {
        db.child('courses/' + courseId)
        .update({assignmentsCount: currNumAssignments - 1});
    });
}

function markAssignmentCompleted(assignmentId) {
    var user = firebase.auth().currentUser;
    var db = firebase.database().ref(user.uid);
    db.child('assignments/' + assignmentId)
    .update({isCompleted: true});
}

function reopenAssignment(assignmentId) {
    var user = firebase.auth().currentUser;
    var db = firebase.database().ref(user.uid);
    db.child('assignments/' + assignmentId)
    .update({isCompleted: false});
}

function submitMilestone() {
    var user = firebase.auth().currentUser;
    var db = firebase.database().ref(user.uid);
    var assignmentId = $('#assignment-select').val();
    var milestoneName = $('#milestone-name').val();
    var date = $('#milestone-date').val();
    var time = $('#milestone-time').val();
    var assignmentName;
    db.child('assignments/' + assignmentId).once('value')
    .then(snapshot => {
        assignmentName = snapshot.val().assignmentName;
    }).then(() => {
        db.child('milestones').push({
            assignmentId: assignmentId,
            assignmentName: assignmentName,
            milestoneName: milestoneName,
            dueDate: date,
            dueTime: time,
            isCompleted: false
        });
    });
    db.child('assignments/' + assignmentId).once('value')
    .then(snapshot => {
        return snapshot.val().milestonesCount;
    }).then(currNumMilestones => {
        db.child('assignments/' + assignmentId)
        .update({milestonesCount: currNumMilestones + 1});
    });
    $('#milestone-modal').modal('toggle');
}

function deleteMilestone(milestoneId, assignmentId) {
    var user = firebase.auth().currentUser;
    var db = firebase.database().ref(user.uid);
    db.child('milestones/' + milestoneId).remove();
    db.child('assignments').child(assignmentId).once('value')
    .then(function (snapshot) {
        return snapshot.val().milestonesCount;
    }).then(currNumMilestones => {
        db.child('assignments/' + assignmentId)
        .update({milestonesCount: currNumMilestones - 1});
    });
}

function markMilestoneCompleted(milestoneId) {
    var user = firebase.auth().currentUser;
    var db = firebase.database().ref(user.uid);
    db.child('milestones/' + milestoneId)
    .update({isCompleted: true});
}

function reopenMilestone(milestoneId) {
    var user = firebase.auth().currentUser;
    var db = firebase.database().ref(user.uid);
    db.child('milestones/' + milestoneId)
    .update({isCompleted: false});
}

function deleteCourse(courseId) {
    var user = firebase.auth().currentUser;
    var db = firebase.database().ref(user.uid);
    db.child('/courses/' + courseId).remove();
}

function signup() {
    var email = document.getElementsByName('email')[0].value;
    var password = document.getElementsByName('password')[0].value;
    firebase.auth().createUserWithEmailAndPassword(email, password)
    .catch(error => {
        console.log(error.code);
        console.log(error.message);
    });
}

function signin() {
    var email = document.getElementsByName('email')[0].value;
    var password = document.getElementsByName('password')[0].value;
    firebase.auth().signInWithEmailAndPassword(email, password)
    .catch(error => {
        console.log(error.code);
        console.log(error.message);
    });
}

function signout() {
    firebase.auth().signOut()
    .catch(error => {
        console.log(error.code);
        console.log(error.message);
    });
}

function initialize() {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            showMain();
        } else {
            showLogin();
        }
    });
}

window.onload = initialize;