{{- define "redis-sentinel.name" -}}
{{ .Chart.Name }}
{{- end }}

{{- define "redis-sentinel.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "redis-sentinel.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{- define "redis-sentinel.labels" -}}
app.kubernetes.io/name: {{ include "redis-sentinel.name" . }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}
