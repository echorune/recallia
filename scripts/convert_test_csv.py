#!/usr/bin/env python3
"""
Recallia Dataset Extractor & Subject Splitter
Reads test.csv, normalizes questions and choices, classifies them into
hierarchical subjects & topics, and exports them into JSON files split subject-wise.
Does NOT use test.csv directly from application code.
"""

import csv
import json
import os
import re
import ast
from collections import defaultdict

TAXONOMY = {
    'Biology & Life Sciences': {
        'slug': 'biology-and-life-sciences',
        'code': 'BIO',
        'description': 'Cellular biology, genetics, ecosystems, organism physiology, and plant science.',
        'color': '#0A9396',
        'topics': {
            'Cell Biology & Genetics': {
                'slug': 'cell-biology-and-genetics',
                'description': 'Prokaryotes vs eukaryotes, DNA, genes, protein synthesis, and cellular structures.',
                'keywords': ['cell', 'dna', 'gene', 'genetic', 'chromosome', 'protein', 'mitosis', 'meiosis', 'mutation', 'prokaryot', 'eukaryot', 'organelle', 'membrane', 'nucleus', 'ribosome', 'cytoplasm']
            },
            'Plant Biology & Photosynthesis': {
                'slug': 'plant-biology-and-photosynthesis',
                'description': 'Light reactions, chloroplasts, leaf anatomy, transpiration, and botanical reproduction.',
                'keywords': ['plant', 'leaf', 'leaves', 'photosynthesis', 'chlorophyll', 'chloroplast', 'seed', 'flower', 'root', 'stem', 'pollen', 'sprout', 'vegetation', 'stomata']
            },
            'Ecology & Ecosystems': {
                'slug': 'ecology-and-ecosystems',
                'description': 'Food chains, trophic levels, adaptations, symbiosis, population dynamics, and biomes.',
                'keywords': ['ecosystem', 'food chain', 'food web', 'predator', 'prey', 'habitat', 'species', 'population', 'biome', 'adaptation', 'survive', 'extinction', 'consumer', 'producer', 'herbivore', 'carnivore', 'decomposer']
            },
            'Human Body & Living Systems': {
                'slug': 'human-body-and-living-systems',
                'description': 'Circulation, respiration, digestion, nerves, organs, and physiological homeostasis.',
                'keywords': ['animal', 'human', 'organ', 'tissue', 'blood', 'heart', 'lung', 'digest', 'breathe', 'respirat', 'muscle', 'bone', 'skeleton', 'nervous', 'brain', 'immune', 'bacteria', 'virus', 'disease', 'circulat']
            }
        }
    },
    'Physics & Mechanics': {
        'slug': 'physics-and-mechanics',
        'code': 'PHYS',
        'description': 'Forces, motion, energy transformations, electricity, magnetism, waves, and optics.',
        'color': '#0F4C5C',
        'topics': {
            'Forces, Motion & Dynamics': {
                'slug': 'forces-motion-and-dynamics',
                'description': 'Newtonian mechanics, speed, acceleration, gravity, friction, and momentum.',
                'keywords': ['force', 'motion', 'speed', 'velocity', 'accelerat', 'gravity', 'friction', 'inertia', 'newton', 'mass', 'weight', 'ramp', 'push', 'pull', 'momentum', 'roller coaster', 'distance']
            },
            'Energy, Work & Heat': {
                'slug': 'energy-work-and-heat',
                'description': 'Kinetic and potential energy, heat transfer, thermal dynamics, and energy conservation.',
                'keywords': ['kinetic energy', 'potential energy', 'energy', 'heat', 'thermal', 'work', 'joule', 'temperature', 'conduction', 'convection', 'radiation', 'conservation of energy', 'mechanical energy']
            },
            'Electricity, Magnetism & Circuits': {
                'slug': 'electricity-magnetism-and-circuits',
                'description': 'Current, voltage, series and parallel circuits, magnetic fields, and electromagnetism.',
                'keywords': ['electric', 'circuit', 'magnet', 'battery', 'voltage', 'current', 'wire', 'pole', 'charge', 'conductor', 'insulator', 'switch', 'resistor', 'amps', 'volts']
            },
            'Waves, Light & Sound': {
                'slug': 'waves-light-and-sound',
                'description': 'Wavelength, reflection, refraction, lenses, auditory vibrations, and the electromagnetic spectrum.',
                'keywords': ['wave', 'sound', 'light', 'reflect', 'refract', 'lens', 'mirror', 'prism', 'frequency', 'vibration', 'pitch', 'echo', 'spectrum', 'wavelength', 'amplitude', 'electromagnetic']
            }
        }
    },
    'Earth & Space Sciences': {
        'slug': 'earth-and-space-sciences',
        'code': 'EARTH',
        'description': 'Planetary systems, geology, plate tectonics, rock cycles, weather, and oceanography.',
        'color': '#CA6702',
        'topics': {
            'Astronomy & Solar System': {
                'slug': 'astronomy-and-solar-system',
                'description': 'Planetary orbits, lunar phases, meteorite impacts, stars, eclipses, and space exploration.',
                'keywords': ['planet', 'solar system', 'sun', 'moon', 'orbit', 'astronomer', 'star', 'galaxy', 'meteor', 'telescope', 'eclipse', 'rotate', 'rotation', 'revolution', 'gravity on moon', 'comet', 'space']
            },
            'Geology, Rocks & Earth History': {
                'slug': 'geology-rocks-and-earth-history',
                'description': 'Rock formation, mineral properties, plate tectonics, earthquakes, volcanoes, and the fossil record.',
                'keywords': ['rock', 'mineral', 'fossil', 'sediment', 'erosion', 'plate', 'tectonic', 'earthquake', 'volcano', 'magma', 'lava', 'crust', 'mantle', 'igneous', 'metamorphic', 'strata', 'soil', 'weathering']
            },
            'Weather, Atmosphere & Water Cycle': {
                'slug': 'weather-atmosphere-and-water-cycle',
                'description': 'Troposphere and atmospheric layers, precipitation, cloud formation, and meteorological phenomena.',
                'keywords': ['weather', 'climate', 'atmosphere', 'cloud', 'rain', 'water cycle', 'evaporat', 'condens', 'precipitat', 'wind', 'humidity', 'hurricane', 'storm', 'ocean', 'tide', 'air pressure']
            }
        }
    },
    'Chemistry & Matter': {
        'slug': 'chemistry-and-matter',
        'code': 'CHEM',
        'description': 'Atomic structure, periodic trends, chemical bonding, reactions, and states of matter.',
        'color': '#9B2226',
        'topics': {
            'Atomic Structure & Elements': {
                'slug': 'atomic-structure-and-elements',
                'description': 'Subatomic particles, electron shells, isotopes, and the periodic table of elements.',
                'keywords': ['atom', 'element', 'proton', 'neutron', 'electron', 'periodic table', 'atomic', 'molecule', 'nucleus of atom', 'isotope']
            },
            'Chemical Reactions & Changes': {
                'slug': 'chemical-reactions-and-changes',
                'description': 'Endothermic/exothermic reactions, conservation of mass, oxidation, acids, bases, and pH.',
                'keywords': ['chemical reaction', 'chemical change', 'react', 'reactant', 'product', 'rust', 'burn', 'acid', 'base', 'ph', 'indicator', 'precipitate', 'combustion', 'neutraliz']
            },
            'States & Properties of Matter': {
                'slug': 'states-and-properties-of-matter',
                'description': 'Phase transitions, density, solubility, mixtures, physical properties, and solutions.',
                'keywords': ['liquid', 'gas', 'solid', 'matter', 'melt', 'boil', 'freeze', 'phase', 'density', 'volume', 'mass', 'solution', 'solvent', 'solute', 'mixture', 'dissolve', 'vapor']
            }
        }
    },
    'Scientific Inquiry & Applied Science': {
        'slug': 'scientific-inquiry-and-applied-science',
        'code': 'SCI',
        'description': 'Experimental methodologies, hypotheses, control variables, engineering, and environmental stewardship.',
        'color': '#EE9B00',
        'topics': {
            'Scientific Method & Experiments': {
                'slug': 'scientific-method-and-experiments',
                'description': 'Hypotheses, independent/dependent variables, controls, data analysis, and laboratory precision.',
                'keywords': ['hypothesis', 'experiment', 'variable', 'control', 'trial', 'investigat', 'measure', 'observation', 'data', 'graph', 'conclusion', 'meter', 'gram', 'liter', 'scale', 'beaker', 'sample']
            },
            'Engineering & Technology': {
                'slug': 'engineering-and-technology',
                'description': 'Engineering design process, structural integrity, sustainable technology, and applied mechanics.',
                'keywords': ['engineer', 'design', 'device', 'material', 'technology', 'system', 'tool', 'bridge', 'structure', 'energy efficient', 'pollution', 'recycle', 'resource', 'prototype', 'model']
            }
        }
    }
}

def clean_choices(choices_str):
    cleaned = re.sub(r'array\(', '', choices_str)
    cleaned = re.sub(r',\s*dtype=object\)', '', cleaned)
    parsed = ast.literal_eval(cleaned)
    labels = [str(lbl).strip() for lbl in parsed['label']]
    texts = [str(txt).strip() for txt in parsed['text']]
    return [{'label': l, 'text': t} for l, t in zip(labels, texts)]

def classify(question_text, choices):
    full_text = question_text + ' ' + ' '.join(c['text'] for c in choices)
    lower = full_text.lower()
    
    best_subject = None
    best_topic = None
    best_score = -1
    
    for subj_name, subj_data in TAXONOMY.items():
        for top_name, top_data in subj_data['topics'].items():
            score = 0
            for kw in top_data['keywords']:
                if ' ' in kw:
                    if kw in lower:
                        score += 3
                else:
                    matches = len(re.findall(r'\b' + re.escape(kw), lower))
                    score += matches
            if score > best_score:
                best_score = score
                best_subject = subj_name
                best_topic = top_name
                
    if best_score <= 0 or not best_subject:
        best_subject = 'Scientific Inquiry & Applied Science'
        best_topic = 'Scientific Method & Experiments'
        
    return best_subject, best_topic

def compute_difficulty(question, choices):
    # Length of question + choices as a proxy for cognitive load
    total_len = len(question) + sum(len(c['text']) for c in choices)
    if total_len < 160:
        return 1 # Easy
    elif total_len < 260:
        return 2 # Medium-Low
    elif total_len < 380:
        return 3 # Medium
    elif total_len < 500:
        return 4 # Hard
    else:
        return 5 # Advanced

def format_card_front(question, choices):
    lines = [question.strip(), ""]
    for c in choices:
        lines.append(f"**{c['label']})** {c['text']}")
    return "\n".join(lines)

def format_card_back(answer_key, answer_text, subject, topic):
    return f"**Correct Answer:** **{answer_key}** — {answer_text}\n\n*Domain:* {subject} › {topic}"

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(base_dir, 'test.csv')
    out_dir = os.path.join(base_dir, 'data', 'seeds')
    os.makedirs(out_dir, exist_ok=True)
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        
    print(f"Loaded {len(rows)} rows from {csv_path}")
    
    subject_cards = defaultdict(list)
    topic_card_counts = defaultdict(int)
    
    for idx, r in enumerate(rows):
        cid = r['id'].strip()
        q = r['question'].strip()
        ans_key = r['answerKey'].strip()
        choices = clean_choices(r['choices'])
        
        # Match correct answer text
        correct_choice = next((c for c in choices if c['label'] == ans_key), None)
        ans_text = correct_choice['text'] if correct_choice else ""
        
        subject, topic = classify(q, choices)
        diff = compute_difficulty(q, choices)
        front = format_card_front(q, choices)
        back = format_card_back(ans_key, ans_text, subject, topic)
        
        card = {
            'id': cid,
            'index': idx + 1,
            'question': q,
            'choices': choices,
            'answerKey': ans_key,
            'answerText': ans_text,
            'front': front,
            'back': back,
            'subject': subject,
            'topic': topic,
            'difficulty': diff,
            'tags': [
                TAXONOMY[subject]['code'],
                topic.lower().replace('&', 'and').replace(',', '').replace(' ', '-'),
                f'level-{diff}'
            ]
        }
        
        subject_cards[subject].append(card)
        topic_card_counts[f"{subject} -> {topic}"] += 1
        
    manifest = {
        'totalCards': len(rows),
        'course': {
            'title': 'General Science & Scientific Inquiry',
            'code': 'SCI-ARC',
            'description': 'Comprehensive multidisciplinary science question bank covering Biology, Physics, Earth Sciences, Chemistry, and Scientific Method.',
        },
        'subjects': []
    }
    
    for subj_name, subj_info in TAXONOMY.items():
        cards = subject_cards[subj_name]
        slug = subj_info['slug']
        filename = f"{slug}.json"
        filepath = os.path.join(out_dir, filename)
        
        # Structure by topics within subject
        topics_meta = []
        for top_name, top_info in subj_info['topics'].items():
            top_cards = [c for c in cards if c['topic'] == top_name]
            topics_meta.append({
                'name': top_name,
                'slug': top_info['slug'],
                'description': top_info['description'],
                'cardCount': len(top_cards)
            })
            
        subject_data = {
            'subjectName': subj_name,
            'slug': slug,
            'code': subj_info['code'],
            'description': subj_info['description'],
            'color': subj_info['color'],
            'totalCards': len(cards),
            'topics': topics_meta,
            'cards': cards
        }
        
        with open(filepath, 'w', encoding='utf-8') as sf:
            json.dump(subject_data, sf, indent=2, ensure_ascii=False)
            
        print(f"Wrote {len(cards)} cards to data/seeds/{filename}")
        
        manifest['subjects'].append({
            'name': subj_name,
            'slug': slug,
            'code': subj_info['code'],
            'color': subj_info['color'],
            'file': filename,
            'cardCount': len(cards),
            'topics': topics_meta
        })
        
    manifest_path = os.path.join(out_dir, 'manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as mf:
        json.dump(manifest, mf, indent=2, ensure_ascii=False)
        
    print(f"Wrote manifest to data/seeds/manifest.json")
    print(f"Total processed: {sum(len(c) for c in subject_cards.values())} cards across {len(subject_cards)} subjects.")

if __name__ == '__main__':
    main()
