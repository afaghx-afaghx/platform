#!/usr/bin/env ruby
# frozen_string_literal: true

require 'digest'
require 'json'
require 'yaml'

REGISTRY = 'docs/architecture/AFX-DOMAIN-ENTITY-OWNERSHIP-001.yaml'
DOMAIN_MAP = 'docs/architecture/AFX-DOMAIN-MAP-001.md'
EVIDENCE = 'evidence/domain-entity-ownership/ownership-verification.json'
EXPECTED_CONTEXTS = 16
EXPECTED_ENTITIES = 81

errors = []
registry_text = File.read(REGISTRY)
domain_map_text = File.read(DOMAIN_MAP)
registry = YAML.safe_load(registry_text, permitted_classes: [], aliases: false)
contexts = registry.fetch('contexts', {})

errors << "context_count=#{contexts.length}, expected=#{EXPECTED_CONTEXTS}" unless contexts.length == EXPECTED_CONTEXTS
all_entities = contexts.flat_map { |owner, data| Array(data['entities']).map { |entity| [entity, owner] } }
entity_names = all_entities.map(&:first)
errors << "entity_count=#{entity_names.length}, expected=#{EXPECTED_ENTITIES}" unless entity_names.length == EXPECTED_ENTITIES
duplicates = entity_names.group_by(&:itself).select { |_k, v| v.length > 1 }.keys
errors << "duplicate_entities=#{duplicates.join(',')}" unless duplicates.empty?
missing_contexts = contexts.keys.reject { |c| domain_map_text.match?(/^###\s+\d+\.\d+\s+#{Regexp.escape(c)}\s*$/) }
errors << "missing_contexts=#{missing_contexts.join(',')}" unless missing_contexts.empty?

# Domain Map entity extraction is intentionally constrained to Owned Entities lines.
map_entities = domain_map_text.lines.filter_map do |line|
  next unless line =~ /^\*\*Owned Entities:\*\*\s*(.+)$/
  Regexp.last_match(1).split(',').map(&:strip)
end.flatten
registry_set = entity_names.uniq.sort
map_set = map_entities.uniq.sort
missing_from_registry = map_set - registry_set
missing_from_domain_map = registry_set - map_set
errors << "missing_from_registry=#{missing_from_registry.join(',')}" unless missing_from_registry.empty?
errors << "missing_from_domain_map=#{missing_from_domain_map.join(',')}" unless missing_from_domain_map.empty?

status = errors.empty? ? 'PASS' : 'FAIL'
evidence = {
  'schema' => 'AFX-DOMAIN-ENTITY-OWNERSHIP-EVIDENCE-001',
  'version' => '1.0.0',
  'status' => status,
  'context_count' => contexts.length,
  'entity_count' => entity_names.length,
  'expected_context_count' => EXPECTED_CONTEXTS,
  'expected_entity_count' => EXPECTED_ENTITIES,
  'duplicate_entities' => duplicates,
  'missing_from_registry' => missing_from_registry,
  'missing_from_domain_map' => missing_from_domain_map,
  'missing_contexts' => missing_contexts,
  'registry_hash' => Digest::SHA256.hexdigest(registry_text),
  'domain_map_hash' => Digest::SHA256.hexdigest(domain_map_text),
  'checks' => {
    'context_count_matches' => contexts.length == EXPECTED_CONTEXTS,
    'entity_count_matches' => entity_names.length == EXPECTED_ENTITIES,
    'every_entity_has_exactly_one_owner' => duplicates.empty? && entity_names.length == entity_names.uniq.length,
    'all_contexts_are_declared_in_domain_map' => missing_contexts.empty?,
    'all_entities_are_declared_in_domain_map' => missing_from_domain_map.empty? && missing_from_registry.empty?
  },
  'errors' => errors
}

FileUtils.mkdir_p(File.dirname(EVIDENCE)) if defined?(FileUtils)
Dir.mkdir('evidence') unless Dir.exist?('evidence')
Dir.mkdir('evidence/domain-entity-ownership') unless Dir.exist?('evidence/domain-entity-ownership')
File.write(EVIDENCE, JSON.pretty_generate(evidence) + "\n")
puts JSON.pretty_generate(evidence)
exit(status == 'PASS' ? 0 : 1)
