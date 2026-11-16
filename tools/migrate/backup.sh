#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"
: "${TARGET_DB:?Set TARGET_DB}"; : "${BACKUP_BUCKET:?Set a dedicated backup bucket}"
: "${S3_ENDPOINT:?Set the same Russian provider S3 endpoint}"; : "${BACKUP_RECIPIENT:?Set an age public recipient key}"
command -v age >/dev/null;command -v aws >/dev/null
tmp=$(mktemp -d)
trap 'rm -f -- "$tmp/application.dump" "$tmp/application.dump.sha256" "$tmp/application.dump.age"; rmdir -- "$tmp"' EXIT
SOURCE_DB="$TARGET_DB" DUMP_FILE="$tmp/application.dump" bash "$(dirname "$0")/dump.sh"
age -r "$BACKUP_RECIPIENT" -o "$tmp/application.dump.age" "$tmp/application.dump"
object="vektor-daily/$(date -u +%Y-%m-%dT%H-%M-%SZ).dump.age"
aws --endpoint-url "$S3_ENDPOINT" s3 cp "$tmp/application.dump.age" "s3://$BACKUP_BUCKET/$object" --only-show-errors
echo 'Encrypted daily backup uploaded. Bucket lifecycle must expire this prefix after 14 days.'
