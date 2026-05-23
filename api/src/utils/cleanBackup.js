import { getSupabase } from "./supabaseClient.js";
import "./loadEnv.js";

const supabase = getSupabase();

/**
 * Recursively fetch all files inside a given folder.
 * Returns array of { path, metadata } so retention can use lastModified.
 */
async function listAllFiles(bucketName, path = "") {
  const { data: items, error } = await supabase.storage
    .from(bucketName)
    .list(path, { limit: 1000 });

  if (error) {
    console.error(`Error listing files in path "${path}":`, error.message);
    return [];
  }

  let allFiles = [];

  for (const item of items) {
    const itemPath = path ? `${path}/${item.name}` : item.name;

    if (item.metadata?.size > 0) {
      // It's a file (has a size) — keep path and metadata for retention filter
      allFiles.push({ path: itemPath, metadata: item.metadata || {} });
    } else {
      // It's a folder (recursively fetch files inside it)
      const subFiles = await listAllFiles(bucketName, itemPath);
      allFiles = allFiles.concat(subFiles);
    }
  }

  return allFiles;
}

/**
 * Deletes the specified files from the bucket.
 * @param {string} bucketName
 * @param {Array<{ path: string }|string>} filesToDelete - Objects with .path or path strings
 */
async function deleteFiles(bucketName, filesToDelete) {
  const paths = filesToDelete.map((f) => (typeof f === "string" ? f : f.path));
  for (const path of paths) {
    const { error } = await supabase.storage.from(bucketName).remove([path]);

    if (error) {
      console.error(`Failed to delete ${path}:`, error.message);
    }
  }
}

/**
 * Cleans up old backups.
 */
async function cleanBackups(
  bucketName,
  retentionPeriodDays,
  deleteAll = false
) {
  try {
    const allFiles = await listAllFiles(bucketName);

    if (allFiles.length === 0) {
      return;
    }

    let filesToDelete;

    if (deleteAll) {
      // Delete all files
      filesToDelete = allFiles;
    } else {
      // Delete files older than the retention period (use file object metadata)
      const now = Date.now();
      const retentionPeriodMs = retentionPeriodDays * 24 * 60 * 60 * 1000;

      filesToDelete = allFiles.filter((file) => {
        const lastModified = file?.metadata?.lastModified;
        if (!lastModified) return false; // skip if no timestamp
        const modifiedTime = new Date(lastModified).getTime();
        if (Number.isNaN(modifiedTime)) return false;
        return now - modifiedTime > retentionPeriodMs;
      });

      if (filesToDelete.length === 0) {
        return;
      }
    }

    // Delete the files (deleteFiles accepts { path } or string)
    await deleteFiles(bucketName, filesToDelete);
  } catch (error) {
    console.error("Error during cleanup:", error.message);
  }
}

// Run the cleanup
const BUCKET_NAME = "backups";
const RETENTION_PERIOD_DAYS = 30; // Retention period: 30 days
const DELETE_ALL = false; // Set true to delete all files, false to respect retention period

cleanBackups(BUCKET_NAME, RETENTION_PERIOD_DAYS, DELETE_ALL);
