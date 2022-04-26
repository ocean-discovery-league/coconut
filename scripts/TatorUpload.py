#!/usr/bin/env python3

import os
import sys
import json
import tator
import socket
import logging

API_TOKEN = '89fe3e220c88ca291e7448a143b83489e16c60d5'  #pbell's token
#API_TOKEN = 'e805c7191bf325527e289a315b03b8fb45310ce5'  #makaniu upload's token

logging.basicConfig(stream=sys.stdout, level=logging.INFO)  # logging.DEBUG is an option
logger = logging.getLogger(__name__)


def lookup_section_id(tator_api, project_id, section_name):
    section_id = False
    sections = tator_api.get_section_list(project_id)
    for section in sections:
        if section.name == section_name:
            section_id = section.id
            break
    return section_id


def get_media_list(tator_api, project_id, section_name):
    medias = []
    section_id = lookup_section_id(tator_api, project_id, section_name)
    if section_id != False:
        medias = tator_api.get_media_list(project_id, section=section_id)
    return medias


def list_media_filenames(tator_api, project_id, section_name):
    medias = get_media_list(tator_api, project_id, section_name)
    filenames = []
    for media in medias:
        filenames.append(media.name)
        if media.media_files and media.media_files.attachment:
            for attachment in media.media_files.attachment:
                filenames.append(attachment.name)
    json.dump(filenames, sys.stdout, indent=0)
    sys.stdout.write('\n')
    

def check_if_duplicate(filename, tator_api, project_id, section_name):
    # check if is this is a duplicate upload
    fname = os.path.basename(filename)
    duplicate = False
    if fname == 'tatorfile.jpg':
        pass
    else:
        medias = get_media_list(tator_api, project_id, section_name)
        for media in medias:
            if media.name == fname:
                duplicate = True
                break
            if media.media_files != None and media.media_files.attachment != None:
                for attachment in media.media_files.attachment:
                    if attachment.name == fname:
                        duplicate = True
                        break
            if duplicate:
                break
    return duplicate


def upload_media_file(media_path, type_id, media_id, tator_api, project_id, section_name):
    if not media_id:
        for progress, response in tator.util.upload_media(tator_api, type_id, media_path, section=section_name):
            logger.info(f"Upload progress: {progress}%")
            sys.stdout.flush()
        logger.info(response.message)
    else:
        # see https://www.tator.io/tutorials/2021-05-19-attach-files-to-media/
        media_id = int(media_id)
        for progress, response in tator.util.upload_attachment(tator_api, media_id, media_path):
            logger.info(f"Upload progress: {progress}%")
            sys.stdout.flush()
        logger.info(response.message)


# TatorUpload.py --type_id 28 --media_path /var/www/html/media/[videoNameHere].mp4
#or, for attachments:
# TatorUpload.py --media_id 1695015 --media_path /var/www/html/media/[sensordatafile].txt
#to list all uploaded filenames, output as json (so nodejs can consume it):
# TatorUpload.py --list

if __name__ == '__main__':
    # use tator's argparse parser which adds --host and --token
    parser = tator.get_parser()

    parser.add_argument('--type_id', type=int, help='Media type ID for upload.')
    parser.add_argument('--media_path', help='Path to media file.')
    parser.add_argument('--media_id', help='Attach to existing media id.')
    parser.add_argument('--nodupecheck', action='store_true', help='Skip duplicate checking.')
    parser.add_argument('--list', action='store_true',
                        help='output list of all uploaded media filenames in json');

    args = parser.parse_args()

    tator_api = tator.get_api(args.host, API_TOKEN);

    # lookup our project id
    #media_types = tator_api.get_media_type(args.type_id)
    #project_id = media_types.project
    project_id = 18  # FIXME the above was not working

    # we use the maki-niu hostname (e.g. mkn0014) as the project section name
    section_name = socket.gethostname()

    if args.list:
        list_media_filenames(tator_api, project_id, section_name)
    else:
        media_path = args.media_path
        type_id = args.type_id
        media_id = args.media_id

        if not args.nodupecheck:
            duplicate = check_if_duplicate(media_path, tator_api, project_id, section_name)
            if duplicate:
                print('skipping upload of duplicate file', media_path)
                sys.stdout.flush()
                sys.exit()

        upload_media_file(media_path, type_id, media_id, tator_api, project_id, section_name)
