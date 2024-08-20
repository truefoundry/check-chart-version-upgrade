import { Octokit } from "octokit";
import path from "path";
import core from "@actions/core";

// Function to get the files changed in a pull request
async function getFilesChanged(repo, pullRequestNumber) {
    const [owner, repoName] = repo.split('/');
    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });

    let filesChangedData = [];
    let page = 1;

    while (true) {
        const response = await octokit.rest.pulls.listFiles({
            owner,
            repo: repoName,
            pull_number: pullRequestNumber,
            per_page: 100,
            page
        });

        const responseData = response.data;
        if (responseData.length === 0) {
            break;
        }
        filesChangedData = filesChangedData.concat(responseData);
        page += 1;
    }

    return filesChangedData;
}

// Function to get the filenames from the files changed data
function getFilenames(filesChangedData) {
    return filesChangedData.map(file => file.filename);
}

// Function to check if a file path matches any of the ignore paths list
function isIgnoredPath(filepath, ignorePaths) {
    return ignorePaths.some(ignorePath => filepath.includes(ignorePath));
}


// Function to get the charts directories changed
function getChartsDirsChanged(filesChanged, ignorePaths) {
    const dirs = new Set();
    filesChanged.forEach(file => {
        const dirname = path.dirname(file);
        if (dirname.includes("charts") && !isIgnoredPath(dirname, ignorePaths)) {
            const chartDir = dirname.split("/").slice(0, 2).join("/");
            dirs.add(chartDir);
        }
    });
    console.log("Dirs:", dirs);
    return Array.from(dirs).sort();
}

// Function to count the number of charts changed
function countChartsChanged(chartsDirsChanged) {
    return chartsDirsChanged.filter(chartDir => chartDir.includes("charts")).length;
}

// Function to count the number of version bumps
function countVersionBumps(filesChangedData, ignorePaths) {
    return filesChangedData.reduce((count, file) => {
        if (isIgnoredPath(file.filename, ignorePaths)) {
            return count;
        } else if (file.filename.endsWith("Chart.yaml") && file.patch.includes("+version")) {
            count += 1;
        }
        return count;
    }, 0);
}

async function main() {
    console.log("Checking if charts were changed and version bumps were found ...");

    const GITHUB_REPOSITORY = core.getInput('repoName');
    const PULL_REQUEST_NUMBER = core.getInput('prNumber');
    const IGNORE_PATHS = core.getMultilineInput('ignorePaths', { required: false });

    console.log("Ignore Paths:", IGNORE_PATHS)

    const filesChangedData = await getFilesChanged(GITHUB_REPOSITORY, PULL_REQUEST_NUMBER);
    const filesChanged = getFilenames(filesChangedData);
    const chartsDirsChanged = getChartsDirsChanged(filesChanged, IGNORE_PATHS);
    const numChartsChanged = countChartsChanged(chartsDirsChanged);
    const numVersionBumps = countVersionBumps(filesChangedData, IGNORE_PATHS);

    console.log("Files Changed:", filesChanged);
    console.log("Charts Dirs Changed:", chartsDirsChanged);
    console.log("Num Charts Changed:", numChartsChanged);
    console.log("Num Version Bumps:", numVersionBumps);

    if (numChartsChanged === 0 && numVersionBumps === 0) {
        console.log("No charts were changed and no version bumps were found. Exiting...");
        process.exit(0);
    }

    if (numChartsChanged !== numVersionBumps) {
        console.log("Error: Number of charts changed does not match the number of version bumps.");
        process.exit(1);
    }

    if (numChartsChanged === numVersionBumps) {
        console.log("Charts were changed and version bumps were found. All good!");
        process.exit(0);
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
