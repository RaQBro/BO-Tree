// app.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Upload route
app.post('/upload', upload.single('excelFile'), (req, res) => {
  const filePath = req.file.path;
  const workbook = xlsx.readFile(filePath);
  const graphData = parseExcelToGraph(workbook);

  // Optionally delete the uploaded file after parsing
  fs.unlinkSync(filePath);

  res.json(graphData);
});

// Parser
const parseExcelToGraph = (workbook) => {
    const boSheet = workbook.Sheets['Bo List'];
    const relationsSheet = workbook.Sheets['Relations'];
  
    if (!boSheet || !relationsSheet) {
      throw new Error('Required sheets not found');
    }
  
    const boList = xlsx.utils.sheet_to_json(boSheet);
    const relations = xlsx.utils.sheet_to_json(relationsSheet);
  
    const boMap = {};
    boList.forEach(bo => {
      boMap[bo['BO_GUID']] = {
        id: bo['BO_GUID'],
        name: bo['DESCRIPTION'] || bo['NAME'] || bo['BO_GUID'],
        children: []
      };
    });
  
    relations.forEach(rel => {
      const parentId = rel['BO_GUID'];
      const childId = rel['REF_BO_GUID'];
      if (boMap[parentId] && boMap[childId]) {
        boMap[parentId].children.push(boMap[childId]);
      }
    });
  
    // Find roots (objects that are not children of anyone)
    const allChildren = new Set(relations.map(rel => rel['REF_BO_GUID']));
    const roots = Object.values(boMap).filter(node => !allChildren.has(node.id));
  
    return roots;
  };

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
