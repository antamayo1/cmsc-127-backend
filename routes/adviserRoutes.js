// Hala ka Aaron ulit

const express = require("express");
const router = express.Router();

const { SQLconnection } = require("../utility");

const axios = require('axios');

// Authentication of Token
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../utility")

// Introduce Encryption
const bcrypt = require("bcrypt");

router.put("/editStatus", authenticateToken, async (req, res) => {
  try {
    const { studentID, newStatus } = req.body;
    await axios.put("https://sais-project.vercel.app/api/student/editStatus", {
      studentId: studentID,
      newStatus: newStatus
    });
    return res.json({success: true});
  } catch (err) {
    console.error("Error fetching details: ", err);
    res.status(500).send("Error fetching details.");
  }
});

router.get("/getEnrolled", async (req, res) => {
  try {
    const enrolled = await axios.get("https://sais-project.vercel.app/api/enrollment/getAllEnrolled");
    return res.json(enrolled.data);
  } catch (err) {
    console.error("Error fetching details: ", err);
    res.status(500).send("Error fetching details.");
  }
});

// Get All Advisees API
router.get("/getAllAdvisees", authenticateToken, async (req, res) => {
  try {
    const { user } = req.user;
    const connection = SQLconnection();
    const query = `SELECT student_id, status FROM Advising_Record WHERE adviser_id = '${user.adviser_id}'`;
    const [data] = await connection.query(query);
    // const students = await axios.get("https://one27-advising.onrender.com/apis/getAllStudents");
    const students = await axios.get("https://sais-project.vercel.app/api/student/getAllStudents");
    return res.json({advisees: data, students: students.data});
  } catch (err) {
    console.error("Error fetching details: ", err);
    res.status(500).send("Error fetching details.");
  }
});

// Get User Info
router.get("/getUser", authenticateToken, async (req, res) => {
  try {
  const { user } = req.user;
  const connection = SQLconnection();
  const query = `SELECT * FROM Adviser_Account WHERE adviser_id = '${user.adviser_id}'`;
  const [isUser] = await connection.query(query);
  if(isUser.length < 1) return res.sendStatus(403);
  connection.end();
  return res.json({
    user
  });
  } catch (err) {
    console.error("Error fetching details: ", err);
    res.status(500).send("Error fetching details.");
  }
});

// Get Checklist of Student
router.get("/getChecklist/:student_id/:program_id", authenticateToken, async (req, res) => {
  try {
    const { student_id, program_id } = req.params;

    const connection = SQLconnection();
    const query = `
    SELECT sub.course_id, sub.term, sub.year, Course_Catalogue.name, Course_Catalogue.category, Course_Catalogue.units, sub.status FROM (SELECT DISTINCT Checklist_Record.course_id, Checklist.term, Checklist.year, status 
    FROM Checklist_Record 
    RIGHT JOIN Checklist 
    ON Checklist_Record.course_id = Checklist.course_id WHERE student_id = ${student_id} and Checklist.program_id = ${program_id}) as sub
    JOIN Course_Catalogue 
    ON Course_Catalogue.course_id = sub.course_id WHERE 1`;
    const [checklist] = await connection.query(query);
    connection.end();
    return res.json(checklist);
  } catch (err) {
    console.error("Error fetching details: ", err);
    res.status(500).send("Error fetching details.");
  }
});

// Get Enrollment Details
router.get("/getEnrollmentDetails", async (req, res) => {
  try {
    const connection = SQLconnection();
    const query = `SELECT * FROM adminEnrollment WHERE 1`
    const [response] = await connection.query(query);
    connection.end();
    return res.json(response);
  } catch (err) {
    console.error("Error fetching details: ", err);
    res.status(500).send("Error fetching details.");
  }
});

router.post("/resetTag", async (req, res) => {
  try {
    const connection = SQLconnection();
    const query = `UPDATE Advising_Record SET status = 0 WHERE 1`
    await connection.query(query);
    connection.end();
    return res.json({success: true});
  } catch (err) {
    console.error("Error fetching details: ", err);
    res.status(500).send("Error fetching details.");
  }
});

// Update Enrollment
router.post("/updateEnrollmentDetails", async (req, res) => {
  try {
    const {start_date, end_date, School_Year, Semester} = req.body;
    const connection = SQLconnection();
    const query = `UPDATE adminEnrollment SET startDate = '${start_date}', endDate = '${end_date}', schoolYear = '${School_Year}', semester = '${Semester}' WHERE id=1`
    await connection.query(query);
    connection.end();
    return res.json({success: true});
  } catch (err) {
    console.error("Error fetching details: ", err);
    res.status(500).send("Error fetching details.");
  }
});

// Log In for Adviser
router.post("/login", async (req, res) => {
  try {
    const {adviser_id, password} = req.body;
    const connection = SQLconnection();
    const query = `
    SELECT
      adviser_id, 
      Adviser_Account.teacher_id,
      password, 
      first_name, 
      middle_name, 
      last_name, 
      position, 
      department 
    FROM Adviser_Account 
    JOIN Teacher 
    ON Adviser_Account.teacher_id = Teacher.teacher_id  WHERE adviser_id = '${adviser_id}'`;
    const [user] = await connection.query(query);
    if(user.length == 0) return res.json({error: true, message:"User does not exist"});

    const passCheck = bcrypt.compare(password, user[0].password);

    if(!passCheck) return res.json({error: true, message:"Incorrect password"});
    const account = {
      user:{
        adviser_id: user[0].adviser_id,
        teacher_id: user[0].teacher_id,
        first_name: user[0].first_name,
        middle_name: user[0].middle_name,
        last_name: user[0].last_name,
        position: user[0].position,
        department: user[0].department
      }
    }
    const accessToken = jwt.sign(account, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
    connection.end();
    return res.json({error: false, message:"User Logged In", accessToken});
  } catch (err) {
    console.error("Error fetching details: ", err);
    res.status(500).send("Error fetching details.")
  }
});

// Tag Student
router.post("/tagStudent/", authenticateToken, async (req, res) => {
  try {
    const { student_id, status } = req.body;
    const connection = SQLconnection();
    const query = `UPDATE Advising_Record SET status = '${status ? 0 : 1}' WHERE student_id = '${student_id}'`;
    console.log(query);
    await connection.query(query);
    connection.end();
    return res.json({Error: false, message:status?"Student Untagged":"Student Tagged"});
  } catch (err) {
    console.error("Error fetching details: ", err);
    res.status(500).send("Error fetching details.");
  }
});

module.exports = router;