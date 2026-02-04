const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class FileOps {
  readFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      logger.error(`Error reading file ${filePath}:`, error);
      return null;
    }
  }

  writeFile(filePath, content) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    } catch (error) {
      logger.error(`Error writing file ${filePath}:`, error);
      return false;
    }
  }

  moveFile(source, destination) {
    try {
      const destDir = path.dirname(destination);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.renameSync(source, destination);
      return true;
    } catch (error) {
      logger.error(`Error moving file from ${source} to ${destination}:`, error);
      return false;
    }
  }

  listFiles(directory, extension = '.md') {
    try {
      if (!fs.existsSync(directory)) {
        return [];
      }
      return fs.readdirSync(directory)
        .filter(file => file.endsWith(extension))
        .map(file => path.join(directory, file));
    } catch (error) {
      logger.error(`Error listing files in ${directory}:`, error);
      return [];
    }
  }

  ensureDirectory(directory) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  }

  fileExists(filePath) {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      logger.error(`Error checking if file exists ${filePath}:`, error);
      return false;
    }
  }

  readDir(directory) {
    try {
      if (!fs.existsSync(directory)) {
        return [];
      }
      return fs.readdirSync(directory);
    } catch (error) {
      logger.error(`Error reading directory ${directory}:`, error);
      return [];
    }
  }
}

module.exports = new FileOps();
