set -eu

escape_sed_replacement() {
  printf '%s' "$1" | sed 's/[&|]/\\&/g'
}

anon_key=$(escape_sed_replacement "$SUPABASE_ANON_KEY")
service_key=$(escape_sed_replacement "$SUPABASE_SERVICE_KEY")

sed \
  -e "s|\${SUPABASE_ANON_KEY}|${anon_key}|g" \
  -e "s|\${SUPABASE_SERVICE_KEY}|${service_key}|g" \
  /home/kong/kong.yml.template > /tmp/kong.yml

export KONG_DECLARATIVE_CONFIG=/tmp/kong.yml
exec /docker-entrypoint.sh kong docker-start
