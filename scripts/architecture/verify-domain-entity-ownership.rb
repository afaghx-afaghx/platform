#!/usr/bin/env ruby
# frozen_string_literal: true

require 'digest'
require 'fileutils'
require 'json'
require 'yaml'

REGISTRY = 'docs/architecture/AFX-DOMAIN-ENTITY-OWNERSHIP-001.yaml'
DOMAIN_MAP = 'docs/architecture/AFX-DOMAIN-MAP-001.md'
EVIDENCE = 'evidence/domain-entity-ownership/ownership-verification.json'
EXPECTED_CONTEXTS = 16
EXPECTED_ENTITIES = 81

errors = []

begin
  registry_text = File.read(REGISTRY)
  domain_map_text = File.read(DOMAIN_MAP)
  registry = YAML.safe_load(registry_text, permitted_classes: [], aliases: false)

  unless registry.is_a?(Hash)
    errors << 'registry_root_is_not_a_mapping'
    registry = {}
  end

  contexts = registry.fetch('contexts', {})
  unless contexts.is_a?(Hash)
    errors << 'registry_contexts_is_not_a_mapping'
    contexts = {}
  end

  errors << "context_count=#{contexts.length}, expected=#{EXPECTED_CONTEXTS}" unless contexts.length == EXPECTED_CONTEXTS

  all_entities = []
  contexts.each do |owner, data|
    unless data.is_a?(Hash)
      errors << "context_data_invalid=#{owner}"
      next
    end
    entities = Array(data['entities']).map { |entity| entity.to_s.strip }.reject(&:empty?)
    errors << "context_has_no_entities=#{owner}" if entities.empty?
    entities.each { |entity| all_entities << [entity, owner.to_s] }
  end

  entity_names = all_entities.map(&:first)
  errors << "entity_count=#{entity_names.length}, expected=#{EXPECTED_ENTITIES}" unless entity_names.length == EXPECTED_ENTITIES

  duplicates = entity_names.group_by(&:itself).select { |_entity, owners| owners.length > 1 }.keys.sort
  errors << "duplicate_entities=#{duplicates.join(',')}" unless duplicates.empty?

  registry_contexts = contexts.keys.map(&:to_s).sort
  map_contexts = domain_map_text.lines.filter_map do |line|
    match = line.match(/^###\s+\d+\.\d+\s+(.+?)\s*$/)
    match ? match[1].strip : nil
  end.uniq.sort

  missing_contexts = registry_contexts - map_contexts
  registry_only_contexts = registry_contexts - map_contexts
  map_only_contexts = map_contexts - registry_contexts
  errors << "missing_contexts=#{missing_contexts.join(',')}" unless missing_contexts.empty?
  errors << "registry_only_contexts=#{registry_only_contexts.join(',')}" unless registry_only_contexts.empty?
  errors << "map_only_contexts=#{map_only_contexts.join(',')}" unless map_only_contexts.empty?

  map_entities = domain_map_text.lines.filter_map do |line|
    match = line.match(/^\*\*Owned Entities:\*\*\s*(.+?)\s*$/)
    next unless match
    match[1].sub(/[.]\s*$/, '').split(',').map { |entity| entity.strip }.reject(&:empty?)
  end.flatten

  registry_set = entity_names.uniq.sort
  map_set = map_entities.uniq.sort
  missing_from_registry = map_set - registry_set
  missing_from_domain_map = registry_set - map_set
  errors << "missing_from_registry=#{missing_from_registry.join(',')}" unless missing_from_registry.empty?
  errors << "missing_from_domain_map=#{missing_from_domain_map.join(',')}" unless missing_from_domain_map.empty?

  checks = {
    'context_count_matches' => contexts.length == EXPECTED_CONTEXTS,
    'entity_count_matches' => entity_names.length == EXPECTED_ENTITIES,
    'every_context_has_entities' => contexts.values.all? { |data| data.is_a?(Hash) && !Array(data['entities']).empty? },
    'every_entity_has_exactly_one_owner' => entity_names.all? { |entity| all_entities.count { |candidate, _owner| candidate == entity } == 1 },
    'duplicate_detection' => duplicates.empty?,
    'all_contexts_are_declared_in_domain_map' => missing_contexts.empty? && registry_only_contexts.empty? && map_only_contexts.empty?,
    'all_entities_are_declared_in_domain_map' => missing_from_domain_map.empty? && missing_from_registry.empty?
  }

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
    'registry_only_contexts' => registry_only_contexts,
    'map_only_contexts' => map_only_contexts,
    'registry_hash' => Digest::SHA256.hexdigest(registry_text),
    'domain_map_hash' => Digest::SHA256.hexdigest(domain_map_text),
    'checks' => checks,
    'errors' => errors
  }

  FileUtils.mkdir_p(File.dirname(EVIDENCE))
  File.write(EVIDENCE, JSON.pretty_generate(evidence) + "\n")
  puts JSON.pretty_generate(evidence)
  exit(status == 'PASS' ? 0 : 1)
rescue StandardError => e
  failure = {
    'schema' => 'AFX-DOMAIN-ENTITY-OWNERSHIP-EVIDENCE-001',
    'version' => '1.0.0',
    'status' => 'FAIL',
    'context_count' => nil,
    'entity_count' => nil,
    'duplicate_entities' => [],
    'missing_from_registry' => [],
    'missing_from_domain_map' => [],
    'missing_contexts' => [],
    'registry_only_contexts' => [],
    'map_only_contexts' => [],
    'registry_hash' => nil,
    'domain_map_hash' => nil,
    'checks' => {},
    'errors' => ["verifier_exception=#{e.class}: #{e.message}"]
  }
  FileUtils.mkdir_p(File.dirname(EVIDENCE))
  File.write(EVIDENCE, JSON.pretty_generate(failure) + "\n")
  warn JSON.pretty_generate(failure)
  exit 1
end
