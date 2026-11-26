# Usage:  source scripts/rds_env.sh
# Sets DATABASE_URL for the RDS instance in THIS shell only. The password comes from
# Secrets Manager at run time and is never written to a file.
# Needs AWS credentials that can describe RDS and read the secret (your admin profile):
#   AWS_PROFILE=default source scripts/rds_env.sh

_info=$(aws rds describe-db-instances --db-instance-identifier nba-project --region us-east-1 \
  --query 'DBInstances[0].[Endpoint.Address,MasterUserSecret.SecretArn]' --output text)
_host=$(printf '%s' "$_info" | cut -f1)
_arn=$(printf '%s' "$_info" | cut -f2)
_pw=$(aws secretsmanager get-secret-value --secret-id "$_arn" --region us-east-1 \
  --query SecretString --output text \
  | python3 -c "import sys,json,urllib.parse; print(urllib.parse.quote(json.load(sys.stdin)['password'], safe=''))")

if [ -n "$_host" ] && [ -n "$_pw" ]; then
  export DATABASE_URL="postgresql://nba_admin:${_pw}@${_host}:5432/nba_project?connect_timeout=15"
  echo "DATABASE_URL set for RDS ($_host) in this shell only"
else
  echo "could not build DATABASE_URL (check AWS_PROFILE and your IP in the security group)"
fi
unset _info _host _arn _pw
