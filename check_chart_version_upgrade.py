import requests
import os

def get_files_changed(repo, pull_request_number):
    headers = {'Accept': 'application/vnd.github.v3+json'}
    api_url = f"https://api.github.com/repos/{repo}/pulls/{pull_request_number}/files"

    files_changed_data = []
    page = 1
    while True:
        response = requests.get(api_url, headers=headers, params={'page': page})
        response_data = response.json()
        if not response_data:
            break
        files_changed_data.extend(response_data)
        page += 1

    return files_changed_data

def get_filenames(files_changed_data):
    return [file['filename'] for file in files_changed_data]

def get_charts_dirs_changed(files_changed):
    dirs = set()
    for file in files_changed:
        dirname = os.path.dirname(file)
        if "charts" in dirname:
            chart_dir = "/".join(dirname.split("/")[:2])
            dirs.add(chart_dir)
    return sorted(dirs)

def count_charts_changed(charts_dirs_changed):
    return sum(1 for chart_dir in charts_dirs_changed if "charts" in chart_dir)

def count_version_bumps(files_changed_data):
    return sum(1 for file in files_changed_data if file['filename'].endswith("Chart.yaml") and "+version" in file['patch'])


if __name__ == "__main__":

    # get variables
    GITHUB_REPOSITORY = os.environ.get('INPUT_REPONAME')
    PULL_REQUEST_NUMBER = os.environ.get('INPUT_PRNUMBER')

    files_changed_data = get_files_changed(GITHUB_REPOSITORY, PULL_REQUEST_NUMBER)
    files_changed = get_filenames(files_changed_data)
    charts_dirs_changed = get_charts_dirs_changed(files_changed)
    num_charts_changed = count_charts_changed(charts_dirs_changed)
    num_version_bumps = count_version_bumps(files_changed_data)

    print("Files Changed:", files_changed)
    print("Charts Dirs Changed:", charts_dirs_changed)
    print("Num Charts Changed:", num_charts_changed)
    print("Num Version Bumps:", num_version_bumps)

    if num_charts_changed != num_version_bumps:
        print("Error: Number of charts changed does not match the number of version bumps.")

    if num_charts_changed == num_version_bumps:
        print("Charts were changed and version bumps were found. All good!")
        exit(0)

    # Set the output variables
    print(f"::set-output name=charts_dirs_changed::{charts_dirs_changed}")
    print(f"::set-output name=num_charts_changed::{num_charts_changed}")
