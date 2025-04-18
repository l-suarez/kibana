# Upgrade Assistant

## About

Upgrade Assistant helps users prepare their Stack for being upgraded to the next version of the Elastic stack.

Its primary purposes are to:

* **Surface deprecations.** Deprecations are features that are currently being used that will be removed in the next major. Surfacing tells the user that there's a problem preventing them from upgrading.
* **Migrate from deprecated features to supported features.** This addresses the problem, clearing the path for the upgrade. Generally speaking, once all deprecations are addressed, the user can safely upgrade.

### UA feature set
Since Kibana version `8.6` UA is enabled to assist users during all upgrades including minor versions of the Elastic Stack.
Some features of the UA are only needed when upgrading to a new major version. These are the following features are controlled by the config `featureSet`:
* ML Snapshots (`featureSet.mlSnapshots`): Machine learning Upgrade mode can be toggled from outside Kibana, the purpose of this feature guard is to hide all ML related deprecations from the end user until the next major upgrade.
When we want to enable ML model snapshot deprecation warnings again we need to change the constant `MachineLearningField.MIN_CHECKED_SUPPORTED_SNAPSHOT_VERSION` to something higher than 7.0.0 in the Elasticsearch code.
* Migrating system indices (`featureSet.migrateSystemIndices`): Migrating system indices should only be enabled for major version upgrades. This config hides the second step from the UA UI for migrating system indices.
* Reindex Data Streams (`featureSet.migrateDataStreams`): Migrating deprecated Data streams should only be enabled for major version upgrades. The purpose of this feature guard is to hide all data streams related deprecations from the end user until the next major upgrade.
* Reindex corrective actions (`featureSet.reindexCorrectiveActions`): Deprecations with reindexing corrective actions are only enabled for major version upgrades. Currently, the reindex actions include some logic that is specific to the [8.0 upgrade](https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/private/upgrade_assistant/server/lib/reindexing/index_settings.ts). End users could get into a bad situation if this is enabled before this logic is fixed.

## Deprecations

There are three sources of deprecation information:

* [**Elasticsearch Deprecation Info API.**](https://www.elastic.co/guide/en/elasticsearch/reference/main/migration-api-deprecation.html)
This is information about Elasticsearch cluster, node, Machine Learning, and index-level settings that use deprecated features that will be removed or changed in the next major version. ES server engineers are responsible for adding deprecations to the Deprecation Info API.
* [**Elasticsearch deprecation logs.**](https://www.elastic.co/guide/en/elasticsearch/reference/current/logging.html#deprecation-logging)
These surface runtime deprecations, e.g. a Painless script that uses a deprecated accessor or a
request to a deprecated API. These are also generally surfaced as deprecation headers within the
response. Even if the cluster state is good, app maintainers need to watch the logs in case
deprecations are discovered as data is migrated. Starting in 7.x, deprecation logs can be written to a file or a data stream ([#58924](https://github.com/elastic/elasticsearch/pull/58924)). When the data stream exists, the Upgrade Assistant provides a way to analyze the logs through Observability or Discover ([#106521](https://github.com/elastic/kibana/pull/106521)).
* [**Kibana deprecations API.**](https://github.com/elastic/kibana/blob/main/src/core/server/deprecations/README.mdx) This is information about deprecated features and configs in Kibana. These deprecations are only communicated to the user if the deployment is using these features. Kibana engineers are responsible for adding deprecations to the deprecations API for their respective team.

### Fixing problems

#### Elasticsearch

Elasticsearch deprecations can be handled in a number of ways:

* **Reindexing.** When a user's index contains deprecations (e.g. mappings) a reindex solves them. The Upgrade Assistant only automates reindexing for indices. For example, if you are currently on 7.x, and want to migrate to 8.0, but you still have indices that were created on 6.x. For this scenario, the user will see a "Reindex" button that they can click, which will perform the reindex.
  * Reindexing is an idempotent action in Upgrade Assistant. It works like this ([overview in code](https://github.com/elastic/kibana/blob/5c13e901ac1bf01bcbcca1d4103c43438ee8f6e6/x-pack/platform/plugins/private/upgrade_assistant/server/lib/reindexing/reindex_service.ts#L503-L545)):
    1. Set a write-block on the original index, no new data can be written during reindexing.
    2. Create a target index with the following name `reindexed-v{majorVersion}-{originalIndex}`. E.g., if `my-index` is the original, the target will be named `reindexed-v8-my-index`.    
      **NOTE:** It overrides the index settings `number_of_replicas` and `refresh_interval` for reindexing performance. They are restored after completion.
    3. [Reindex](https://www.elastic.co/guide/en/elasticsearch/reference/master/docs-reindex.html) from the original index to the target index. Kibana will continuously report reindexing status.
    4. Restores the original `number_of_replicas` and `refresh_interval` index settings.
    5. Once reindexing is done, in one atomic operation via the aliases API:
       1. Create an alias from the original index to the target index. All existing aliases referencing the original index will be re-pointed to the target index. E.g., `my-index` will be an alias referencing `reindexed-v8-my-index`.
       2. Delete the original index.
       3. **NOTE:** writing/indexing will effectively be re-enabled at this point via the alias, unless the original was write-blocked by users. This and other index settings are inherited from the original.
    6. The Upgrade Assistant's reindex action is complete at this point.
       1. If the original index was closed before reindexing, the new target will also be closed at this point.

    Currently, reindexing deprecations are only enabled for major version upgrades by setting the config `featureSet.reindexCorrectiveActions` to `true` on the `x.last` version of the stack.

Reindexing at the moment includes some logic that is specific to the [8.0 upgrade](https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/private/upgrade_assistant/server/lib/reindexing/index_settings.ts). End users could get into a bad situation if this is enabled before this logic is fixed.
* **Removing settings.** Some index and cluser settings are deprecated and need to be removed. The Upgrade Assistant provides a way to auto-resolve these settings via a "Remove deprecated settings" button. Migrating system indices should only be enabled for major version upgrades. This is controlled by the config `featureSet.migrateSystemIndices` which hides the second step from the UA UI for migrating system indices.
* **Upgrading or deleting snapshots**. This is specific to Machine Learning. If a user has old Machine Learning job model snapshots, they will need to be upgraded or deleted. The Upgrade Assistant provides a way to resolve this automatically for the user ([#100066](https://github.com/elastic/kibana/pull/100066)).
Deprecations related to ML snapshots are only enabled during `x.last` version of the stack. This is controlled by the `featureSet.mlSnapshots` config. When we want to enable ML model snapshot deprecation warnings again we need to change the constant `MachineLearningField.MIN_CHECKED_SUPPORTED_SNAPSHOT_VERSION` to something higher than `7.0.0` in the Elasticsearch code.
* **Following the docs.** The Deprecation Info API provides links to the deprecation docs. Users
will follow these docs to address the problem and make these warnings or errors disappear in the
Upgrade Assistant.

#### Kibana

Kibana deprecations can be handled in one of two ways:

* **Automatic resolution.** Some deprecations can be fixed automatically through Upgrade Assistant via an API call. When this is possible, users will see a "Quick resolve" button in the Upgrade Assistant.
* **Manual steps.** For deprecations that require the user to address manually, the Upgrade Assistant provides a list of steps to follow as well as a link to documentation. Once the deprecation is addressed, it will no longer appear in the Upgrade Assistant.

### Steps for testing
#### Elasticsearch deprecations

To test the Elasticsearch deprecations page ([#107053](https://github.com/elastic/kibana/pull/107053)), you will first need to create a set of deprecations that will be returned from the deprecation info API.

**1. Reindexing**

  The reindex action appears in UA whenever the deprecation `Index created before XX` is encountered. To reproduce, you will need to start up a cluster on the previous major version (e.g., if you are running 7.x, start a 6.8 cluster). Create a handful of indices, for example:

  ```
  PUT my_index
  ```

  Next, point to the 6.x data directory when running from a 7.x cluster.

  ```
  yarn es snapshot -E path.data=./path_to_6.x_indices
  ```

  **Token-based authentication**

  Reindexing should also work using token-based authentication (implemented via [#111451](https://github.com/elastic/kibana/pull/111451)). To simulate, set the following parameters when running ES from a snapshot:

  ```
  yarn es snapshot -E path.data=./path_to_6.x_indices -E xpack.security.authc.token.enabled=true -E xpack.security.authc.api_key.enabled=true
  ```

  Then, update your `kibana.dev.yml` file to include:

  ```
  xpack.security.authc.providers:
      token:
         token1:
            order: 0
            showInSelector: true
            enabled: true
  ```

  To verify it's working as expected, kick off a reindex task in UA. Then, navigate to **Security > API keys** and verify an API key was created. The name should be prefixed with `ua_reindex_`. Once the reindex task has completed successfully, the API key should be deleted.

**2. Upgrading or deleting ML job model snapshots**

  Similar to the reindex action, the ML action requires setting up a cluster on the previous major version. It also requires the trial license to be enabled. Then, you will need to create a few ML jobs in order to trigger snapshots.

  - Add the Kibana sample data.
  - Navigate to Machine Learning > Create new job.
  - Select `kibana_sample_data_flights` index.
  - Select "Single metric job".
  - Add an aggregation, field, and job ID. Change the time range to "Absolute" and select a subset of time.
  - Click "Create job"
  - View the job created and click the "Start datafeed" action associated with it. Select a subset of time and click "Start". You should now have two snapshots created. If you want to add more, repeat the steps above.

  Next, point to the 6.x data directory when running from a 7.x cluster.

  ```
  yarn es snapshot --license trial -E path.data=./path_to_6.x_ml_snapshots
  ```

**3. Removing deprecated settings**

  The Upgrade Assistant supports removing deprecated index and cluster settings. This is determined based on the `actions` array returned from the deprecation info API. It currently does not support removing affix settings. See https://github.com/elastic/elasticsearch/pull/84246 for more details.

  Run the following Console commands to trigger deprecation issues for cluster and index settings:

```
// Can be set as persistent or transient
PUT /_cluster/settings
{
  "persistent" : {
    "script.context.filter.cache_max_size": 10,
    "script.context.update.cache_max_size": 10,
    "script.context.update.max_compilations_rate": "10/1m",
    "discovery.zen.minimum_master_nodes": 10,
    "discovery.zen.commit_timeout": "10s",
    "discovery.zen.no_master_block": "all",
    "discovery.zen.publish_diff.enable": true,
    "discovery.zen.publish_timeout": "10s",
    "indices.lifecycle.step.master_timeout": "10s",
    "script.context.field.max_compilations_rate": "10/1m",
    "script.context.score.max_compilations_rate": "10/1m",
    "script.context.interval.cache_expire": "10s",
    "script.context.moving-function.cache_expire": "10s",
    "xpack.watcher.history.cleaner_service.enabled": true,
    "cluster.routing.allocation.exclude._tier": "data_warm",
    "cluster.routing.allocation.include._tier": "data_cold",
    "cluster.routing.allocation.require._tier": "data_hot",
    "xpack.monitoring.elasticsearch.collection.enabled": true,
    "xpack.monitoring.collection.enabled": true,
    "xpack.monitoring.collection.interval": "20s",
    "xpack.monitoring.collection.ccr.stats.timeout": "20s",
    "xpack.monitoring.collection.cluster.stats.timeout": "20s",
    "xpack.monitoring.collection.enrich.stats.timeout": "20s",
    "xpack.monitoring.collection.index.recovery.timeout": "20s",
    "xpack.monitoring.collection.index.stats.timeout": "20s",
    "xpack.monitoring.collection.ml.job.stats.timeout": "20s",
    "xpack.monitoring.collection.node.stats.timeout": "20s",
    "xpack.monitoring.collection.index.recovery.active_only": true,
    "xpack.monitoring.history.duration": "2d",
    "xpack.monitoring.migration.decommission_alerts": true,
    "cluster.routing.allocation.shard_state.reroute.priority": "HIGH",
    "cluster.routing.allocation.disk.include_relocations": true
  }
}
```

  ```
  PUT deprecated_settings
  {
    "settings": {
      "index.indexing.slowlog.level": "warn",
      "index.max_adjacency_matrix_filters":  10,
      "index.routing.allocation.exclude._tier": "data_warm",
      "index.routing.allocation.include._tier": "data_hot",
      "index.routing.allocation.require._tier": "data_cold",
      "index.search.slowlog.level": "warn",
      "index.soft_deletes.enabled": true,
      "index.translog.retention.size": "1mb",
      "index.translog.retention.age": "5s"
    }
  }
  ```

**4. Other deprecations with no automatic resolutions**

  Many deprecations emitted from the deprecation info API are too complex to provide an automatic resolution for in UA. In this case, UA provides details about the deprecation as well as a link to documentation. The following requests will emit deprecations from the deprecation info API. This list is *not* exhaustive of all possible deprecations. You can find the full list of [7.x deprecations in the Elasticsearch repo](https://github.com/elastic/elasticsearch/tree/7.x/x-pack/plugin/deprecation/src/main/java/org/elasticsearch/xpack/deprecation) by grepping `new DeprecationIssue` in the code.

  ```
  PUT /nested_multi_fields
  {
    "mappings":{
        "properties":{
          "text":{
              "type":"text",
              "fields":{
                "english":{
                    "type":"text",
                    "analyzer":"english",
                    "fields":{
                      "english":{
                          "type":"text",
                          "analyzer":"english"
                      }
                    }
                }
              }
          }
        }
    }
  }
  ```

  ```
  PUT field_names_enabled
  {
    "mappings": {
      "_field_names": {
        "enabled": false
      }
    }
  }
  ```

  ```
  PUT /_cluster/settings
  {
    "persistent" : {
      "indices.lifecycle.poll_interval" : "500ms"
    }
  }
  ```

  ```
  PUT _template/field_names_enabled
  {
    "index_patterns": ["foo"],
    "mappings": {
      "_field_names": {
        "enabled": false
      }
    }
  }
  ```

  ```
  // This is only applicable for indices created prior to 7.x
  PUT joda_time
  {
    "mappings" : {
        "properties" : {
          "datetime": {
            "type": "date",
            "format": "yyyy/MM/dd HH:mm:ss||yyyy/MM/dd||epoch_millis"
          }
        }
      }
  }
  ```

#### Kibana deprecations
To test the Kibana deprecations page, you will first need to create a set of deprecations that will be returned from the Kibana deprecations API.

`reporting` is currently one of the only plugins that is registering a deprecation with an automated resolution (implemented via [#104303](https://github.com/elastic/kibana/pull/104303)). To trigger this deprecation:

1. Add Kibana sample data.
2. Create a PDF report from the Dashboard (**Dashboard > Share > PDF reports > Generate PDFs**). This requires a trial license.
3. Issue the following request in Console:

```
PUT .reporting-*/_settings
{
  "settings": {
    "index.lifecycle.name": null
  }
}
```

#### Kibana API deprecations:
Run kibana locally with the test example plugin that has deprecated routes
```
yarn start --plugin-path=examples/routing_example --plugin-path=examples/developer_examples
```

The following comprehensive deprecated routes examples are registered inside the folder: `examples/routing_example/server/routes/deprecated_routes`

Run them in the console to trigger the deprecation condition so they show up in the UA:
We need to explicitly set the query param `elasticInternalOrigin` to `false` to track the request as non-internal origin.

```
# Route deprecations for Versioned routes
GET kbn:/api/routing_example/d/versioned_route?apiVersion=2023-10-31&elasticInternalOrigin=false

# Route deprecations for Non-versioned routes
GET kbn:/api/routing_example/d/removed_route?elasticInternalOrigin=false
GET kbn:/api/routing_example/d/deprecated_route?elasticInternalOrigin=false
POST kbn:/api/routing_example/d/migrated_route?elasticInternalOrigin=false
{}

# Access deprecations
GET kbn:/api/routing_example/d/internal_deprecated_route?elasticInternalOrigin=false
GET kbn:/internal/routing_example/d/internal_only_route?elasticInternalOrigin=false
GET kbn:/internal/routing_example/d/internal_versioned_route?apiVersion=1&elasticInternalOrigin=false
```

1. You can also mark as deprecated in the UA to remove the deprecation from the list.
2. Check the telemetry response to see the reported data about the deprecated route.
3. Internally you can see the deprecations counters from the dev console by running the following:
```
GET .kibana_usage_counters/_search
{
    "query": {
        "bool": {
            "should": [
              {"match": { "usage-counter.counterType": "deprecated_api_call:total"}},
              {"match": { "usage-counter.counterType": "deprecated_api_call:resolved"}},
              {"match": { "usage-counter.counterType": "deprecated_api_call:marked_as_resolved"}}
            ]
        }
    }
}

```

For a complete list of Kibana deprecations, refer to the [8.0 Kibana deprecations meta issue](https://github.com/elastic/kibana/issues/109166).

### Errors

This is a non-exhaustive list of different error scenarios in Upgrade Assistant. It's recommended to use the [tweak browser extension](https://chrome.google.com/webstore/detail/tweak-mock-api-calls/feahianecghpnipmhphmfgmpdodhcapi?hl=en), or something similar, to mock the API calls.

- **Error loading deprecation logging status.** Mock a `404` status code to `GET /api/upgrade_assistant/deprecation_logging`. Alternatively, edit [this line](https://github.com/elastic/kibana/blob/dd6376d3be3d2916bae334cd50a56ca558d1ed4b/x-pack/platform/plugins/private/upgrade_assistant/public/application/lib/api.ts#L151) locally and replace `deprecation_logging` with `fake_deprecation_logging`.
- **Error updating deprecation logging status.** Mock a `404` status code to `PUT /api/upgrade_assistant/deprecation_logging`. Alternatively, edit [this line](https://github.com/elastic/kibana/blob/dd6376d3be3d2916bae334cd50a56ca558d1ed4b/x-pack/platform/plugins/private/upgrade_assistant/public/application/lib/api.ts#L141) locally and replace `deprecation_logging` with `fake_deprecation_logging`.
- **Unauthorized error fetching ES deprecations.** Mock a `403` status code to `GET /api/upgrade_assistant/es_deprecations` with the response payload: `{ "statusCode": 403 }`
- **Partially upgraded error fetching ES deprecations.** Mock a `426` status code to `GET /api/upgrade_assistant/es_deprecations` with the response payload: `{ "statusCode": 426, "attributes": { "allNodesUpgraded": false } }`
- **Upgraded error fetching ES deprecations.** Mock a `426` status code to `GET /api/upgrade_assistant/es_deprecations` with the response payload: `{ "statusCode": 426, "attributes": { "allNodesUpgraded": true } }`

### Telemetry

The Upgrade Assistant tracks several triggered events in the UI, using Kibana Usage Collection service's [UI counters](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/usage_collection/README.mdx#ui-counters).

**Overview page**
- Component loaded
- Click event for "Create snapshot" button
- Click event for "View deprecation logs in Observability" link
- Click event for "Analyze logs in Discover" link
- Click event for "Reset counter" button

**ES deprecations page**
- Component loaded
- Click events for starting and stopping reindex tasks
- Click events for upgrading or deleting a Machine Learning snapshot
- Click event for deleting a deprecated index setting

**Kibana deprecations page**
- Component loaded
- Click event for "Quick resolve" button

In addition to UI counters, the Upgrade Assistant has a [custom usage collector](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/usage_collection/README.mdx#custom-collector). It currently is only responsible for tracking whether the user has deprecation logging enabled or not.

For testing instructions, refer to the [Kibana Usage Collection service README](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/usage_collection/README.mdx#testing).
